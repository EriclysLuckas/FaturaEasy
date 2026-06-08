import { z } from 'zod'

export const createPurchaseSchema =
  z.object({
    description: z.string().min(2),

    amount: z.number().positive(),

    installments: z
      .number()
      .int()
      .min(1)
      .max(24),

    purchaseDate: z.coerce.date(),

    creditCardId: z.string().uuid(),
  })

export const purchaseIdSchema =
  z.object({
    id: z.string().uuid(),
  })

export const listPurchasesQuerySchema =
  z.object({
    creditCardId:
      z.string().uuid().optional(),

    month:
      z.coerce.number().optional(),

    year:
      z.coerce.number().optional(),
  })