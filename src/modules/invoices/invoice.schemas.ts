// src/modules/invoices/invoice.schemas.ts

import { z } from 'zod'

//
// PARAMS
//

export const getInvoiceParamsSchema =
  z.object({
    cardId:
      z.string().uuid(),

    month:
      z.coerce
        .number()
        .int()
        .min(1)
        .max(12),

    year:
      z.coerce
        .number()
        .int()
        .min(2020),
  })

//
// USER
//

export const invoiceUserSchema =
  z.object({
    id:
      z.string().uuid(),

    name:
      z.string(),

    email:
      z.string().email(),
  })

//
// PURCHASE
//

export const invoicePurchaseSchema =
  z.object({
    id:
      z.string().uuid(),

    description:
      z.string(),

    purchaseDate:
      z.date(),
  })

//
// INSTALLMENT
//

export const invoiceInstallmentSchema =
  z.object({
    id:
      z.string().uuid(),

    amount:
      z.number(),

    installmentNumber:
      z.number(),

    status:
      z.enum([
        'PENDING',
        'PAID',
        'CANCELED',
      ]),

    purchase:
      invoicePurchaseSchema,

    user:
      invoiceUserSchema,
  })

//
// CARD
//

export const invoiceCardSchema =
  z.object({
    id:
      z.string().uuid(),

    name:
      z.string(),

    totalLimit:
      z.number(),

    closingDay:
      z.number(),

    dueDay:
      z.number(),
  })

//
// INVOICE INFO
//

export const invoiceInfoSchema =
  z.object({
    id:
      z.string().uuid(),

    status:
      z.enum([
        'OPEN',
        'CLOSED',
        'PAID',
      ]),

    closedAt:
      z.date().nullable(),

    paidAt:
      z.date().nullable(),
  })

//
// COMPETENCE
//

export const invoiceCompetenceSchema =
  z.object({
    month:
      z.number(),

    year:
      z.number(),
  })

//
// TOTAL BY USER
//

export const invoiceTotalByUserSchema =
  z.record(
    z.string(),
    z.object({
      userId:
        z.string().uuid(),

      name:
        z.string(),

      total:
        z.number(),
    })
  )

//
// INVOICE RESPONSE
//

export const invoiceResponseSchema =
  z.object({
    invoice:
      invoiceInfoSchema,

    card:
      invoiceCardSchema,

    competence:
      invoiceCompetenceSchema,

    total:
      z.number(),

    installments:
      z.array(
        invoiceInstallmentSchema
      ),

    totalsByUser:
      invoiceTotalByUserSchema
        .nullable(),
  })

//
// EMPTY INVOICE RESPONSE
//

export const emptyInvoiceResponseSchema =
  z.object({
    message:
      z.string(),

    card:
      z.object({
        id:
          z.string().uuid(),

        name:
          z.string(),
      }),

    competence:
      invoiceCompetenceSchema,

    total:
      z.number(),

    installments:
      z.array(z.any()),
  })

//
// CLOSE INVOICE RESPONSE (autoclose interno)
//

export const closeInvoiceResponseSchema =
  z.object({
    id:
      z.string().uuid(),

    creditCardId:
      z.string().uuid(),

    month:
      z.number(),

    year:
      z.number(),

    status:
      z.enum([
        'OPEN',
        'CLOSED',
        'PAID',
      ]),

    totalAmount:
      z.number(),

    openedAt:
      z.date(),

    closedAt:
      z.date().nullable(),
  })