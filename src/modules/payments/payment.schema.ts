import { z } from 'zod'

export const payInvoiceParamsSchema =
  z.object({
    invoiceId: z.string().uuid(),
  })