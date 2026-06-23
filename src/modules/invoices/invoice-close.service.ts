import { prisma } from '../../infra/database/prisma.js'

import { NotFoundError }
  from '../../shared/errors/not-found-error.js'

import { ConflictError }
  from '../../shared/errors/conflict-error.js'

export class InvoiceCloseService {
  //
  // FECHAR FATURA
  //

  async closeInvoice(
    creditCardId: string,
    month: number,
    year: number
  ) {
    const invoice =
      await prisma.invoice.findUnique({
        where: {
          creditCardId_month_year: {
            creditCardId,
            month,
            year,
          },
        },

        include: {
          creditCard: true,
        },
      })

    if (!invoice) {
      throw new NotFoundError(
        'Invoice not found'
      )
    }

    if (
      invoice.status === 'CLOSED'
    ) {
      throw new ConflictError(
        'Invoice already closed'
      )
    }

    if (
      invoice.status === 'PAID'
    ) {
      throw new ConflictError(
        'Invoice already paid'
      )
    }

    const installments =
      await prisma.purchaseInstallment.findMany(
        {
          where: {
            competenceMonth: month,

            competenceYear: year,

            status: {
              not: 'CANCELED',
            },

            purchase: {
              creditCardId,
            },
          },

          select: {
            amount: true,
          },
        }
      )

    const totalAmount =
      installments.reduce(
        (acc, installment) =>
          acc +
          Number(installment.amount),
        0
      )

    const closedInvoice =
      await prisma.invoice.update({
        where: {
          id: invoice.id,
        },

        data: {
          status: 'CLOSED',

          closedAt: new Date(),
        },
      })

    return {
      id:
        closedInvoice.id,

      creditCardId:
        closedInvoice.creditCardId,

      month:
        closedInvoice.month,

      year:
        closedInvoice.year,

      status:
        closedInvoice.status,

      totalAmount,

      openedAt:
        closedInvoice.openedAt,

      closedAt:
        closedInvoice.closedAt,
    }
  }

  //
  // FECHAMENTO AUTOMÁTICO
  //

  async autoCloseInvoices() {
    const openInvoices =
      await prisma.invoice.findMany({
        where: {
          status: 'OPEN',
        },

        include: {
          creditCard: true,
        },
      })

    const now =
      new Date()

    const closedInvoices = []

    for (const invoice of openInvoices) {
      try {
        const closingDate =
          new Date(
            invoice.year,
            invoice.month - 1,
            invoice.creditCard.closingDay,
            23,
            59,
            59
          )

        if (
          now <= closingDate
        ) {
          continue
        }

        const result =
          await this.closeInvoice(
            invoice.creditCardId,
            invoice.month,
            invoice.year
          )

        closedInvoices.push(
          result
        )

        console.log(
          `Invoice ${invoice.month}/${invoice.year} closed`
        )
      } catch (error) {
        console.error(
          `Error closing invoice ${invoice.month}/${invoice.year}`,
          error
        )
      }
    }

    return {
      success: true,

      totalClosed:
        closedInvoices.length,

      invoices:
        closedInvoices,
    }
  }
}