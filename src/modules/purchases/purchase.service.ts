// src/modules/purchases/purchase.service.ts

import { prisma }
  from '../../infra/database/prisma.js'

import { AppError }
  from '../../shared/errors/app-error.js'

import { PermissionService }
  from '../permissions/permissions.service.js'

import { InvoiceEngineService }
  from '../invoices/invoice-engine.service.js'

import { InvoiceLifecycleService }
  from '../invoices/invoice-lifecycle.service.js'

const permissionService =
  new PermissionService()

const invoiceEngine =
  new InvoiceEngineService()

const invoiceLifecycle =
  new InvoiceLifecycleService()

interface CreatePurchaseInput {
  description: string

  amount: number

  installments: number

  purchaseDate: Date

  creditCardId: string

  userId: string
}

interface GetPurchaseInput {
  id: string

  userId: string
}

interface CancelPurchaseInput {
  id: string

  userId: string
}

export class PurchaseService {
  //
  // CREATE PURCHASE
  //

  async create(
    data: CreatePurchaseInput
  ) {
    //
    // VALIDA USUÁRIO DO CARTÃO
    //

    const isCardUser =
      await permissionService.isCardUser(
        data.userId,
        data.creditCardId
      )

    if (!isCardUser) {
      throw new AppError(
        'User does not belong to this card',
        403
      )
    }

    //
    // BUSCA VÍNCULO
    //

    const cardLink =
      await prisma.creditCardUser.findUnique(
        {
          where: {
            userId_creditCardId: {
              userId: data.userId,

              creditCardId:
                data.creditCardId,
            },
          },
        }
      )

    if (!cardLink) {
      throw new AppError(
        'Card link not found',
        404
      )
    }

    //
    // BUSCA CARTÃO
    //

    const card =
      await prisma.creditCard.findUnique({
        where: {
          id: data.creditCardId,
        },
      })

    if (!card) {
      throw new AppError(
        'Card not found',
        404
      )
    }

    //
    // LIMITE INDIVIDUAL
    //

    const userPendingInstallments =
      await prisma.purchaseInstallment.findMany(
        {
          where: {
            userId: data.userId,

            status: 'PENDING',

            purchase: {
              creditCardId:
                data.creditCardId,
            },
          },
        }
      )

    const userUsedLimit =
      userPendingInstallments.reduce(
        (acc, installment) =>
          acc +
          Number(installment.amount),
        0
      )

    const userAvailableLimit =
      Number(cardLink.limitGranted) -
      userUsedLimit

    //
    // LIMITE GLOBAL
    //

    const cardPendingInstallments =
      await prisma.purchaseInstallment.findMany(
        {
          where: {
            status: 'PENDING',

            purchase: {
              creditCardId:
                data.creditCardId,
            },
          },
        }
      )

    const cardUsedLimit =
      cardPendingInstallments.reduce(
        (acc, installment) =>
          acc +
          Number(installment.amount),
        0
      )

    const cardAvailableLimit =
      Number(card.totalLimit) -
      cardUsedLimit

    //
    // VALIDAÇÕES
    //

    if (
      data.amount >
      userAvailableLimit
    ) {
      throw new AppError(
        'User limit exceeded',
        400
      )
    }

    if (
      data.amount >
      cardAvailableLimit
    ) {
      throw new AppError(
        'Card has insufficient limit',
        400
      )
    }

    //
    // COMPETÊNCIA FINANCEIRA
    //

    const purchaseDay =
      data.purchaseDate.getDate()

    let competenceMonth =
      data.purchaseDate.getMonth() + 1

    let competenceYear =
      data.purchaseDate.getFullYear()

    //
    // COMPRA APÓS FECHAMENTO
    //

    if (
      purchaseDay > card.closingDay
    ) {
      competenceMonth += 1

      if (competenceMonth > 12) {
        competenceMonth = 1

        competenceYear += 1
      }
    }

    //
    // DISTRIBUIÇÃO FINANCEIRA
    //

    const baseInstallment =
      Math.floor(
        (data.amount /
          data.installments) *
          100
      ) / 100

    const totalBase =
      baseInstallment *
      data.installments

    const difference = Number(
      (
        data.amount - totalBase
      ).toFixed(2)
    )

    //
    // TRANSACTION
    //

    return prisma.$transaction(
      async (tx) => {
        //
        // CRIA PURCHASE
        //

        const purchase =
          await tx.purchase.create({
            data: {
              description:
                data.description,

              amount: data.amount,

              installments:
                data.installments,

              purchaseDate:
                data.purchaseDate,

              userId: data.userId,

              creditCardId:
                data.creditCardId,
            },
          })

        //
        // CONTROLE DE FATURAS
        //

        const processedInvoices =
          new Set<string>()

        //
        // GERA PARCELAS
        //

        for (
          let i = 0;
          i < data.installments;
          i++
        ) {
          let installmentAmount =
            baseInstallment

          //
          // ÚLTIMA PARCELA
          //

          if (
            i ===
            data.installments - 1
          ) {
            installmentAmount +=
              difference
          }

          let currentMonth =
            competenceMonth + i

          let currentYear =
            competenceYear

          //
          // ROLLOVER ANO
          //

          while (currentMonth > 12) {
            currentMonth -= 12

            currentYear += 1
          }

          //
          // VALIDA FATURA
          //

          const existingInvoice =
            await tx.invoice.findUnique({
              where: {
                creditCardId_month_year: {
                  creditCardId:
                    data.creditCardId,

                  month:
                    currentMonth,

                  year:
                    currentYear,
                },
              },
            })

          if (existingInvoice) {
            const invoiceStatus =
              invoiceLifecycle.getInvoiceStatus(
                {
                  month:
                    existingInvoice.month,

                  year:
                    existingInvoice.year,

                  status:
                    existingInvoice.status,

                  paidAt:
                    existingInvoice.paidAt,

                  closingDay:
                    card.closingDay,
                }
              )

            if (
              invoiceStatus ===
                'CLOSED' ||
              invoiceStatus ===
                'PAID'
            ) {
              throw new AppError(
                `Invoice ${currentMonth}/${currentYear} is closed`,
                400
              )
            }
          }

          //
          // CRIA PARCELA
          //

          await tx.purchaseInstallment.create(
            {
              data: {
                purchaseId:
                  purchase.id,

                userId: data.userId,

                installmentNumber:
                  i + 1,

                amount:
                  installmentAmount,

                competenceMonth:
                  currentMonth,

                competenceYear:
                  currentYear,

                status: 'PENDING',
              },
            }
          )

          //
          // EVITA DUPLICIDADE
          //

          const invoiceKey =
            `${currentMonth}-${currentYear}`

          if (
            processedInvoices.has(
              invoiceKey
            )
          ) {
            continue
          }

          processedInvoices.add(
            invoiceKey
          )

          //
          // GARANTE INVOICE
          //

          await invoiceEngine.ensureInvoiceExists(
            data.creditCardId,
            currentMonth,
            currentYear
          )
        }

        return purchase
      }
    )
  }

  //
  // LISTA COMPRAS
  //

  async listByCard(
    creditCardId: string,
    userId: string
  ) {
    const isCardUser =
      await permissionService.isCardUser(
        userId,
        creditCardId
      )

    if (!isCardUser) {
      throw new AppError(
        'Access denied',
        403
      )
    }

    return prisma.purchase.findMany({
      where: {
        creditCardId,
      },

      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },

        installmentsData: true,
      },

      orderBy: {
        purchaseDate: 'desc',
      },
    })
  }

  //
  // BUSCA COMPRA
  //

  async getById(
    data: GetPurchaseInput
  ) {
    const purchase =
      await prisma.purchase.findUnique({
        where: {
          id: data.id,
        },

        include: {
          installmentsData: true,

          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },

          creditCard: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })

    if (!purchase) {
      throw new AppError(
        'Purchase not found',
        404
      )
    }

    const isCardUser =
      await permissionService.isCardUser(
        data.userId,
        purchase.creditCardId
      )

    if (!isCardUser) {
      throw new AppError(
        'Access denied',
        403
      )
    }

    return purchase
  }

  //
  // CANCELA COMPRA
  //

  async cancel(
    data: CancelPurchaseInput
  ) {
    const purchase =
      await prisma.purchase.findUnique({
        where: {
          id: data.id,
        },

        include: {
          installmentsData: true,

          creditCard: true,
        },
      })

    if (!purchase) {
      throw new AppError(
        'Purchase not found',
        404
      )
    }

    const isOwner =
      await permissionService.isCardOwner(
        data.userId,
        purchase.creditCardId
      )

    if (!isOwner) {
      throw new AppError(
        'Access denied',
        403
      )
    }

    //
    // VALIDA FATURAS
    //

    for (const installment of purchase.installmentsData) {
      const invoice =
        await prisma.invoice.findUnique({
          where: {
            creditCardId_month_year: {
              creditCardId:
                purchase.creditCardId,

              month:
                installment.competenceMonth,

              year:
                installment.competenceYear,
            },
          },
        })

      if (!invoice) {
        continue
      }

      const invoiceStatus =
        invoiceLifecycle.getInvoiceStatus(
          {
            month: invoice.month,

            year: invoice.year,

            status:
              invoice.status,

            paidAt:
              invoice.paidAt,

            closingDay:
              purchase.creditCard
                .closingDay,
          }
        )

      if (
        invoiceStatus === 'CLOSED' ||
        invoiceStatus === 'PAID'
      ) {
        throw new AppError(
          `Invoice ${installment.competenceMonth}/${installment.competenceYear} is closed`,
          400
        )
      }
    }

    //
    // CANCELA PARCELAS
    //

    await prisma.purchaseInstallment.updateMany(
      {
        where: {
          purchaseId: data.id,
        },

        data: {
          status: 'CANCELED',
        },
      }
    )

    //
    // RECALCULA FATURAS
    //

    const processedInvoices =
      new Set<string>()

    for (const installment of purchase.installmentsData) {
      const invoiceKey =
        `${installment.competenceMonth}-${installment.competenceYear}`

      if (
        processedInvoices.has(
          invoiceKey
        )
      ) {
        continue
      }

      processedInvoices.add(
        invoiceKey
      )

      await invoiceEngine.syncInvoice(
        purchase.creditCardId,
        installment.competenceMonth,
        installment.competenceYear
      )
    }

    return {
      success: true,

      message:
        'Purchase canceled successfully',
    }
  }
}