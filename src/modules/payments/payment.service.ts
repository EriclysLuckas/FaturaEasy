// src/modules/payments/payment.service.ts

import { prisma } from '../../infra/database/prisma.js'

import { PermissionService } from '../permissions/permissions.service.js'

interface PayInvoiceInput {
  invoiceId: string
  userId: string
}

export class PaymentService {
  private permissionService =
    new PermissionService()

  async payInvoice({
    invoiceId,
    userId,
  }: PayInvoiceInput) {
    // busca invoice
    const invoice =
      await prisma.invoice.findUnique({
        where: {
          id: invoiceId,
        },
      })

    if (!invoice) {
      throw new Error(
        'Invoice not found'
      )
    }

    // valida owner
    const isOwner =
      await this.permissionService.isCardOwner(
        userId,
        invoice.creditCardId
      )

    if (!isOwner) {
      throw new Error(
        'Only owner can pay invoice'
      )
    }

    // valida status
    if (invoice.status === 'PAID') {
      throw new Error(
        'Invoice already paid'
      )
    }

    return prisma.$transaction(
      async (tx) => {
        // marca parcelas da competência
        await tx.purchaseInstallment.updateMany(
          {
            where: {
              competenceMonth:
                invoice.month,

              competenceYear:
                invoice.year,

              status: 'PENDING',

              purchase: {
                creditCardId:
                  invoice.creditCardId,
              },
            },

            data: {
              status: 'PAID',
            },
          }
        )

        // atualiza invoice
        const updatedInvoice =
          await tx.invoice.update({
            where: {
              id: invoice.id,
            },

            data: {
              status: 'PAID',

              paidAt: new Date(),
            },
          })

        return updatedInvoice
      }
    )
  }
}