// src/modules/invoices/invoice-engine.service.ts

import { prisma } from '../../infra/database/prisma.js'

export class InvoiceEngineService {
//
// 🔥 garante existência da invoice
//

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

    totalAmount: 0,
  },
})

}

//
// 🔥 recalcula valor REAL da invoice
//

async recalculateInvoiceTotal(
creditCardId: string,
month: number,
year: number
) {
//
// busca parcelas pendentes
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

      select: {
        amount: true,
      },
    }
  )

//
// soma total
//

const totalAmount =
  installments.reduce(
    (acc, installment) =>
      acc +
      Number(installment.amount),
    0
  )

//
// atualiza invoice
//

return prisma.invoice.update({
  where: {
    creditCardId_month_year: {
      creditCardId,
      month,
      year,
    },
  },

  data: {
    totalAmount,
  },
})

}

//
// 🔥 sincroniza invoice
//

async syncInvoice(
creditCardId: string,
month: number,
year: number
) {
//
// garante invoice
//

await this.ensureInvoiceExists(
  creditCardId,
  month,
  year
)



return this.recalculateInvoiceTotal(
  creditCardId,
  month,
  year
)

}
}
