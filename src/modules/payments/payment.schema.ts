// src/modules/payments/payment.schemas.ts

import { z } from 'zod'

export const payInvoiceParamsSchema =
  z.object({
    invoiceId:
      z.string().uuid(),
  })

export const payInvoiceDataSchema =
 z.object({
  // success: z.literal(true),

  // data: z.object({
    invoice: z.object({
      id: z.string().uuid(),
      status: z.enum([
        'OPEN',
        'CLOSED',
        'PAID',
      ]),
      month: z.number(),
      year: z.number(),
      paidAt: z.date().nullable(),
    }),

    card: z.object({
      id: z.string().uuid(),
      name: z.string(),
    }),

    totalPaid: z.number(),

    paidInstallments: z.number(),
  })
