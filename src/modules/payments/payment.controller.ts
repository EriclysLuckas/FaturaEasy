// src/modules/payments/payment.controller.ts

import {
  FastifyReply,
  FastifyRequest,
} from 'fastify'

import { z } from 'zod'

import { PaymentService } from './payment.service.js'

const paymentService =
  new PaymentService()

export class PaymentController {
  async payInvoice(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    const params = z
      .object({
        invoiceId: z.string().uuid(),
      })
      .parse(request.params)

    const result =
      await paymentService.payInvoice({
        invoiceId: params.invoiceId,

        userId: String(
          request.user.sub
        ),
      })

    return reply.send(result)
  }
}