import { prisma }
  from '../../infra/database/prisma.js'

import { PermissionService }
  from '../permissions/permissions.service.js'

import { InvoiceLifecycleService }
  from '../invoices/invoice-lifecycle.service.js'

import { NotFoundError }
  from '../../shared/errors/not-found-error.js'

import { ForbiddenError }
  from '../../shared/errors/forbidden-error.js'

import {
  InvoiceNotClosedError,
  NoPendingInstallmentsError,
} from '../../shared/errors/financial-erros.js'

interface PayInvoiceInput {
  invoiceId: string
  userId: string
}

export class PaymentService {
  private permissionService =
    new PermissionService()

  private invoiceLifecycleService =
    new InvoiceLifecycleService()

  async payInvoice({
    invoiceId,
    userId,
  }: PayInvoiceInput) {
    const invoice =
      await prisma.invoice.findUnique({
        where: {
          id: invoiceId,
        },

        include: {
          creditCard: {
            select: {
              id: true,
              name: true,
              closingDay: true,
            },
          },
        },
      })

    if (!invoice) {
      throw new NotFoundError(
        'Invoice not found'
      )
    }

    const isOwner =
      await this.permissionService.isCardOwner(
        userId,
        invoice.creditCardId
      )

    if (!isOwner) {
      throw new ForbiddenError(
        'Only owner can pay invoice'
      )
    }

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
            invoice.creditCard
              .closingDay,
        }
      )

    if (
      calculatedStatus !== 'CLOSED'
    ) {
      throw new InvoiceNotClosedError()
    }

    return prisma.$transaction(
      async (tx) => {
        const pendingInstallments =
          await tx.purchaseInstallment.findMany(
            {
              where: {
                competenceMonth:
                  invoice.month,

                competenceYear:
                  invoice.year,

                status:
                  'PENDING',

                purchase: {
                  creditCardId:
                    invoice.creditCardId,
                },
              },

              select: {
                id: true,
                amount: true,
              },
            }
          )

        if (
          pendingInstallments.length === 0
        ) {
          throw new NoPendingInstallmentsError()
        }

        const totalPaid =
          pendingInstallments.reduce(
            (
              acc,
              installment
            ) =>
              acc +
              Number(
                installment.amount
              ),
            0
          )

        await tx.purchaseInstallment.updateMany(
          {
            where: {
              id: {
                in:
                  pendingInstallments.map(
                    (
                      installment
                    ) =>
                      installment.id
                  ),
              },
            },

            data: {
              status: 'PAID',
            },
          }
        )

        const updatedInvoice =
          await tx.invoice.update({
            where: {
              id: invoice.id,
            },

            data: {
              status: 'PAID',

              paidAt:
                new Date(),
            },
          })

        return {
          success: true,

          message:
            'Invoice paid successfully',

          invoice: {
            id:
              updatedInvoice.id,

            status:
              updatedInvoice.status,

            month:
              updatedInvoice.month,

            year:
              updatedInvoice.year,

            paidAt:
              updatedInvoice.paidAt,
          },

          card: {
            id:
              invoice.creditCard.id,

            name:
              invoice.creditCard.name,
          },

          totalPaid,

          paidInstallments:
            pendingInstallments.length,
        }
      }
    )
  }
}