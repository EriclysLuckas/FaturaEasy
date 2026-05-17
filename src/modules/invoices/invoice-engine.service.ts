// src/modules/invoices/invoice-engine.service.ts

import { prisma } from '../../infra/database/prisma.js'

export class InvoiceEngineService {
  async ensureInvoiceExists(
    creditCardId: string,
    month: number,
    year: number
  ) {
    //
    // verifica se invoice já existe
    //
    const existingInvoice =
      await prisma.invoice.findUnique({
        where: {
          creditCardId_month_year: {
            creditCardId,
            month,
            year,
          },
        },
      })

    if (existingInvoice) {
      //
      // se estiver OPEN
      // recalcula total dinâmico
      //
      if (
        existingInvoice.status ===
        'OPEN'
      ) {
        await this.updateInvoiceTotal(
          existingInvoice.id
        )
      }

      return existingInvoice
    }

    //
    // busca cartão
    //
    const card =
      await prisma.creditCard.findUnique({
        where: {
          id: creditCardId,
        },
      })

    if (!card) {
      throw new Error(
        'Card not found'
      )
    }

    //
    // calcula total inicial
    //
    const installments =
      await prisma.purchaseInstallment.findMany(
        {
          where: {
            competenceMonth: month,

            competenceYear: year,

            status: 'PENDING',

            purchase: {
              creditCardId,
            },
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

    //
    // cria invoice
    //
    const invoice =
      await prisma.invoice.create({
        data: {
          creditCardId,

          month,

          year,

          totalAmount,

          status: 'OPEN',

          openedAt: new Date(),
        },
      })

    return invoice
  }

  //
  // recalcula total da invoice
  //
  async updateInvoiceTotal(
    invoiceId: string
  ) {
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

    //
    // apenas OPEN recalcula
    //
    if (
      invoice.status !== 'OPEN'
    ) {
      return invoice
    }

    const installments =
      await prisma.purchaseInstallment.findMany(
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
        }
      )

    const totalAmount =
      installments.reduce(
        (acc, installment) =>
          acc +
          Number(installment.amount),
        0
      )

    return prisma.invoice.update({
      where: {
        id: invoice.id,
      },

      data: {
        totalAmount,
      },
    })
  }

  //
  // fechamento automático
  //
  async autoCloseInvoice(
    invoiceId: string
  ) {
    const invoice =
      await prisma.invoice.findUnique({
        where: {
          id: invoiceId,
        },

        include: {
          creditCard: true,
        },
      })

    if (!invoice) {
      throw new Error(
        'Invoice not found'
      )
    }

    //
    // já fechada
    //
    if (
      invoice.status !== 'OPEN'
    ) {
      return invoice
    }

    const now = new Date()

    //
    // data de fechamento
    //
    const closingDate = new Date(
      invoice.year,
      invoice.month - 1,
      invoice.creditCard.closingDay,
      23,
      59,
      59
    )

    //
    // ainda não chegou fechamento
    //
    if (now < closingDate) {
      return invoice
    }

    //
    // fecha invoice
    //
    return prisma.invoice.update({
      where: {
        id: invoice.id,
      },

      data: {
        status: 'CLOSED',

        closedAt: new Date(),
      },
    })
  }

  //
  // marcar invoice como paga
  //
  async markInvoiceAsPaid(
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
      })

    if (!invoice) {
      throw new Error(
        'Invoice not found'
      )
    }

    return prisma.invoice.update({
      where: {
        id: invoice.id,
      },

      data: {
        status: 'PAID',

        paidAt: new Date(),
      },
    })
  }
}