// src/modules/payments/payment.service.ts

import { prisma } from '../../infra/database/prisma.js'

import { PermissionService } from '../permissions/permissions.service.js'

interface PayInvoiceInput {
  userId: string
  creditCardId: string
  month: number
  year: number
}

export class PaymentService {
  private permissionService =
    new PermissionService()

  async payInvoice({
    userId,
    creditCardId,
    month,
    year,
  }: PayInvoiceInput) {
    // 🔐 Apenas owner pode pagar invoice
    const isOwner =
      await this.permissionService.isCardOwner(
        userId,
        creditCardId
      )

    if (!isOwner) {
      throw new Error(
        'Only owner can pay invoice'
      )
    }

    // Busca parcelas pendentes da competência
    const installments =
      await prisma.purchaseInstallment.findMany({
        where: {
          purchase: {
            creditCardId,
          },

          competenceMonth: month,

          competenceYear: year,

          status: 'PENDING',
        },

        select: {
          id: true,
          amount: true,
        },
      })

    // Valida invoice
    if (installments.length === 0) {
      throw new Error(
        'No pending installments for this invoice'
      )
    }

    // Soma total pago
    const totalPaid =
      installments.reduce(
        (sum, installment) =>
          sum + Number(installment.amount),
        0
      )

    // Transaction financeira
    await prisma.$transaction(async (tx) => {
      await tx.purchaseInstallment.updateMany({
        where: {
          id: {
            in: installments.map(
              (installment) =>
                installment.id
            ),
          },
        },

        data: {
          status: 'PAID',
        },
      })
    })

    return {
      success: true,

      message:
        'Invoice paid successfully',

      totalPaid,

      paidInstallments:
        installments.length,

      competence: {
        month,
        year,
      },
    }
  }
}