// src/modules/invoices/invoice.controller.ts

import {
  FastifyReply,
  FastifyRequest,
} from 'fastify'

import { z } from 'zod'

import { InvoiceService } from './invoice.service.js'

const invoiceService =
  new InvoiceService()

export class InvoiceController {
  async getInvoice(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    const params = z
      .object({
        cardId: z.string().uuid(),

        month: z.coerce
          .number()
          .min(1)
          .max(12),

        year: z.coerce
          .number()
          .min(2020),
      })
      .parse(request.params)

    const invoice =
      await invoiceService.getInvoice({
        userId: String(
          request.user.sub
        ),

        creditCardId:
          params.cardId,

        month: params.month,

        year: params.year,
      })

    return reply.send(invoice)
  }
}