// src/modules/invoices/invoice.service.ts

import { prisma } from '../../infra/database/prisma.js'

import { PermissionService } from '../permissions/permissions.service.js'

import { InvoiceLifecycleService } from './invoice-lifecycle.service.js'

interface GetInvoiceInput {
  userId: string

  creditCardId: string

  month: number

  year: number
}

export class InvoiceService {
  private permissionService =
    new PermissionService()

  private invoiceLifecycleService =
    new InvoiceLifecycleService()

  async getInvoice({
    userId,
    creditCardId,
    month,
    year,
  }: GetInvoiceInput) {
    //
    // 🔐 valida permissões
    //

    const isOwner =
      await this.permissionService.isCardOwner(
        userId,
        creditCardId
      )

    const isCardUser =
      await this.permissionService.isCardUser(
        userId,
        creditCardId
      )

    if (!isOwner && !isCardUser) {
      throw new Error('Access denied')
    }

    //
    // 💳 busca cartão
    //

    const card =
      await prisma.creditCard.findUnique({
        where: {
          id: creditCardId,
        },

        select: {
          id: true,

          name: true,

          totalLimit: true,

          closingDay: true,

          dueDay: true,
        },
      })

    if (!card) {
      throw new Error('Card not found')
    }

    //
    // 📦 busca parcelas da competência
    //

    const installments =
      await prisma.purchaseInstallment.findMany(
        {
          where: {
            competenceMonth: month,

            competenceYear: year,

            purchase: {
              creditCardId,
            },

            ...(isOwner
              ? {}
              : {
                  userId,
                }),
          },

          include: {
            purchase: {
              select: {
                id: true,

                description: true,

                purchaseDate: true,
              },
            },

            user: {
              select: {
                id: true,

                name: true,

                email: true,
              },
            },
          },

          orderBy: [
            {
              purchase: {
                purchaseDate: 'asc',
              },
            },

            {
              installmentNumber: 'asc',
            },
          ],
        }
      )

    //
    // 🔥 sem parcelas = sem invoice
    //

    if (installments.length === 0) {
      return {
        message:
          'No invoice for this period',

        card: {
          id: card.id,

          name: card.name,
        },

        competence: {
          month,
          year,
        },

        total: 0,

        installments: [],
      }
    }

    //
    // 🔥 busca invoice persistida
    //

    const invoice =
      await prisma.invoice.findUnique({
        where: {
          creditCardId_month_year: {
            creditCardId,
            month,
            year,
          },
        },
      })

    if (!invoice) {
      throw new Error(
        'Invoice record not found'
      )
    }

    //
    // 🔥 calcula status REAL
    //

    const calculatedStatus =
      this.invoiceLifecycleService.getInvoiceStatus(
        {
          month:
            invoice.month,

          year:
            invoice.year,

          status:
            invoice.status,

          paidAt:
            invoice.paidAt,

          closingDay:
            card.closingDay,
        }
      )

    //
    // 💰 total dinâmico
    //

    const total =
      installments.reduce(
        (acc, installment) =>
          acc +
          Number(
            installment.amount
          ),
        0
      )

    //
    // 👥 totais por usuário
    //

    let totalsByUser: Record<
      string,
      {
        userId: string

        name: string

        total: number
      }
    > | null = null

    if (isOwner) {
      totalsByUser =
        installments.reduce(
          (acc, installment) => {
            const key =
              installment.user.id

            if (!acc[key]) {
              acc[key] = {
                userId:
                  installment.user.id,

                name:
                  installment.user.name,

                total: 0,
              }
            }

            acc[key].total += Number(
              installment.amount
            )

            return acc
          },
          {} as Record<
            string,
            {
              userId: string

              name: string

              total: number
            }
          >
        )
    }

    //
    // 📄 retorno final
    //

    return {
      invoice: {
        id: invoice.id,

        status:
          calculatedStatus,

        closedAt:
          invoice.closedAt,

        paidAt:
          invoice.paidAt,
      },

      card: {
        id: card.id,

        name: card.name,

        totalLimit: Number(
          card.totalLimit
        ),

        closingDay:
          card.closingDay,

        dueDay: card.dueDay,
      },

      competence: {
        month,
        year,
      },

      total,

      installments: installments.map(
        (installment) => ({
          id: installment.id,

          amount: Number(
            installment.amount
          ),

          installmentNumber:
            installment.installmentNumber,

          status:
            installment.status,

          purchase: {
            id:
              installment.purchase.id,

            description:
              installment.purchase
                .description,

            purchaseDate:
              installment.purchase
                .purchaseDate,
          },

          user: {
            id:
              installment.user.id,

            name:
              installment.user.name,

            email:
              installment.user.email,
          },
        })
      ),

      totalsByUser,
    }
  }
}