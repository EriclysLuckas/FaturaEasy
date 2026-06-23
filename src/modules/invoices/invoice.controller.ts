// src/modules/invoices/invoice.controller.ts

import {
  FastifyReply,
  FastifyRequest,
} from 'fastify'

import { InvoiceService }
  from './invoice.service.js'

import {
  getInvoiceParamsSchema,
} from './invoice.schemas.js'

const invoiceService =
  new InvoiceService()

export class InvoiceController {
  //
  // GET INVOICE
  //

  async getInvoice(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    const params =
      getInvoiceParamsSchema.parse(
        request.params
      )

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

    return reply
      .status(200)
      .send({
        success: true,

        data: invoice,
      })
  }
}