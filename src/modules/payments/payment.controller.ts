// src/modules/payments/payment.controller.ts

import {
  FastifyReply,
  FastifyRequest,
} from 'fastify'

import { PaymentService } from './payment.service.js'

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
    //
    // VALIDA PARÂMETROS
    //

    const params =
      payInvoiceParamsSchema.parse(
        request.params
      )

    //
    // PROCESSA PAGAMENTO
    //

    const result =
      await paymentService.payInvoice({
        invoiceId: params.invoiceId,
        userId: String(request.user.sub),
      })

    //
    // RESPOSTA PADRONIZADA
    //

    return reply.send({
      success: true,
      data: result,
    })
  }
}