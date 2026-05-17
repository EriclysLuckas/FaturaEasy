// src/modules/payments/payment.controller.ts

import {
  FastifyReply,
  FastifyRequest,
} from 'fastify'

import { PaymentService } from './payment.service.js'

import { payInvoiceParamsSchema } from './payment.schema.js'

const paymentService =
  new PaymentService()

export class PaymentController {
  async payInvoice(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    const params =
      payInvoiceParamsSchema.parse(
        request.params
      )

    const result =
      await paymentService.payInvoice({
        userId: request.user.sub,

        creditCardId: params.cardId,

        month: params.month,

        year: params.year,
      })

    return reply.status(200).send(result)
  }
}