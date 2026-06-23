import { prisma } from '../../infra/database/prisma.js'

export class InvoiceEngineService {
  async ensureInvoiceExists(
    creditCardId: string,
    month: number,
    year: number
  ) {
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
      return existingInvoice
    }

    return prisma.invoice.create({
      data: {
        creditCardId,
        month,
        year,
        status: 'OPEN',
      },
    })
  }

  async syncInvoice(
    creditCardId: string,
    month: number,
    year: number
  ) {
    return this.ensureInvoiceExists(
      creditCardId,
      month,
      year
    )
  }
}