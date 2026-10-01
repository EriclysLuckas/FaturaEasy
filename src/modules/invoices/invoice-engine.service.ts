import {
  Prisma,
} from '@prisma/client'

import { prisma }
  from '../../infra/database/prisma.js'

export class InvoiceEngineService {
  async ensureInvoiceExists(
    creditCardId: string,
    month: number,
    year: number,
    db:
      | Prisma.TransactionClient
      | typeof prisma = prisma
  ) {
    const existingInvoice =
      await db.invoice.findUnique({
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

    return db.invoice.create({
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
    year: number,
    db:
      | Prisma.TransactionClient
      | typeof prisma = prisma
  ) {
    return this.ensureInvoiceExists(
      creditCardId,
      month,
      year,
      db
    )
  }
}
