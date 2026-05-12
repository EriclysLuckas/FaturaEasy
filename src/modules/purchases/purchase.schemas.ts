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