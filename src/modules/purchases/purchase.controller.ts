import {
  FastifyReply,
  FastifyRequest,
} from 'fastify'

import { PurchaseService } from './purchase.service.js'

import { createPurchaseSchema } from './purchase.schemas.js'

const purchaseService =
  new PurchaseService()

export class PurchaseController {
  async create(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    const body =
      createPurchaseSchema.parse(
        request.body
      )

    const purchase =
      await purchaseService.create({
        ...body,

        userId: String(
          request.user.sub
        ),
      })

    return reply
      .status(201)
      .send(purchase)
  }
}