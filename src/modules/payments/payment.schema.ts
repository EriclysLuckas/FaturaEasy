import { z } from 'zod'

export const payInvoiceParamsSchema =
  z.object({
    cardId: z.string().uuid(),

    year: z.coerce.number(),

    month: z.coerce
      .number()
      .min(1)
      .max(12),
  })