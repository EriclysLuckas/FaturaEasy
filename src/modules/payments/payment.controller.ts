import {
  FastifyReply,
  FastifyRequest,
} from 'fastify'

import { PaymentService }
  from './payment.service.js'

import {
  payInvoiceParamsSchema,
} from './payment.schema.js'

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
        invoiceId:
          params.invoiceId,

        userId: String(
          request.user.sub
        ),
      })

    return reply.send(result)
  }
}