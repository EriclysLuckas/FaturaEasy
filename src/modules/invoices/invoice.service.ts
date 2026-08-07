// src/modules/invoices/invoice.service.ts

import { prisma }
  from '../../infra/database/prisma.js'

import { PermissionService }
  from '../permissions/permissions.service.js'

import { InvoiceLifecycleService }
  from './invoice-lifecycle.service.js'

import { ForbiddenError }
  from '../../shared/errors/forbidden-error.js'

import { NotFoundError }
  from '../../shared/errors/not-found-error.js'





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
    // PERMISSÕES
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
      throw new ForbiddenError(
        'Access denied'
      )
    }

    //
    // CARTÃO
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
      throw new NotFoundError(
        'Card not found'
      )
    }

    //
    // FATURA
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

    //
    // NÃO EXISTE FATURA
    //

    if (!invoice) {
      return {
        message: 'No invoice for this period',

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
    // PARCELAS DA COMPETÊNCIA
    //

    const installments =
      await prisma.purchaseInstallment.findMany({
        where: {
          competenceMonth: month,

          competenceYear: year,
          status: {
            not: 'CANCELED',
          },
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
      })

    //
    // STATUS REAL
    //

    const calculatedStatus =
      this.invoiceLifecycleService.getInvoiceStatus({
        month: invoice.month,

        year: invoice.year,

        status: invoice.status,

        paidAt: invoice.paidAt,

        closingDay: card.closingDay,
      })

    //
    // TOTAL DA FATURA
    //

    const total =
      installments.reduce(
        (
          total,
          installment
        ) =>
          total +
          Number(
            installment.amount
          ),
        0
      )

    //
    // TOTAIS POR USUÁRIO
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
          (
            acc,
            installment
          ) => {
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

            acc[key].total +=
              Number(
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
    // RETORNO
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

        dueDay:
          card.dueDay,
      },

      competence: {
        month,
        year,
      },

      total,

      installments:
        installments.map(
          (
            installment
          ) => ({
            id:
              installment.id,

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