// src/modules/invoices/invoice-close.service.ts

import { prisma } from '../../infra/database/prisma.js'

export class InvoiceCloseService {
  //
  //  FECHA UMA FATURA
  //

  async closeInvoice(
    creditCardId: string,
    month: number,
    year: number
  ) {
    //
    //  BUSCA FATURA
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
    //  FATURA JÁ FECHADA
    //

    if (
      invoice.status === 'CLOSED'
    ) {
      throw new Error(
        'Invoice already closed'
      )
    }

    //
    //  FATURA JÁ PAGA
    //

    if (
      invoice.status === 'PAID'
    ) {
      throw new Error(
        'Invoice already paid'
      )
    }

    //
    //  BUSCA PARCELAS DA COMPETÊNCIA
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
          },

          select: {
            amount: true,
          },
        }
      )

    //
    //  CALCULA TOTAL FINAL
    //

    const totalAmount =
      installments.reduce(
        (acc, installment) =>
          acc +
          Number(installment.amount),
        0
      )

    //
    //  FECHA FATURA
    //

    const closedInvoice =
      await prisma.invoice.update({
        where: {
          id: invoice.id,
        },

        data: {
          status: 'CLOSED',

          closedAt: new Date(),

          totalAmount,
        },
      })

    //
    //  RETORNO
    //

    return {
      success: true,

      message:
        'Invoice closed successfully',

      invoice: {
        id: closedInvoice.id,

        month:
          closedInvoice.month,

        year:
          closedInvoice.year,

        status:
          closedInvoice.status,

        totalAmount: Number(
          closedInvoice.totalAmount
        ),

        closedAt:
          closedInvoice.closedAt,
      },
    }
  }
//
//  FECHA FATURAS VENCIDAS
//

async autoCloseInvoices() {
  //
  //  BUSCA FATURAS OPEN
  //

  const openInvoices =
    await prisma.invoice.findMany({
      where: {
        status: 'OPEN',
      },

      include: {
        creditCard: true,
      },
    })

  const now = new Date()

  const closedInvoices = []

  //
  //  PROCESSA CADA FATURA
  //

  for (const invoice of openInvoices) {
    try {
      //
      //  DATA DE FECHAMENTO
      //

      const closingDate =
        new Date(
          invoice.year,
          invoice.month - 1,
          invoice.creditCard
            .closingDay,
          23,
          59,
          59
        )

      //
      //  AINDA NÃO FECHOU
      //

      if (now <= closingDate) {
        continue
      }

      //
      //  FECHA FATURA
      //

      const closedInvoice =
        await this.closeInvoice(
          invoice.creditCardId,
          invoice.month,
          invoice.year
        )

      closedInvoices.push(
        closedInvoice
      )

      console.log(
        ` Invoice ${invoice.month}/${invoice.year} closed`
      )
    } catch (error) {
      //
      //  NÃO QUEBRA O LOOP
      //

      console.error(
        ` Error closing invoice ${invoice.month}/${invoice.year}`,
        error
      )
    }
  }

  //
  //  LOG FINAL
  //

  console.log(
    ` ${closedInvoices.length} invoices closed`
  )

  //
  //  RETORNO
  //

  return {
    success: true,

    totalClosed:
      closedInvoices.length,

    invoices:
      closedInvoices,
  }
}
}