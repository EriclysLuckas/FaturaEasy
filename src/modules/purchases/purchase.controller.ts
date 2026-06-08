import {
  FastifyReply,
  FastifyRequest,
} from 'fastify'

import { PurchaseService } from './purchase.service.js'

import {
  createPurchaseSchema,
  purchaseIdSchema,
} from './purchase.schemas.js'

const purchaseService =
  new PurchaseService()

export class PurchaseController {
  //
  // CREATE
  //

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

  //
  // LIST
  //

  async list(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    const query = purchaseIdSchema.parse(
      request.params
    )

    const purchases =
      await purchaseService.listByCard(
        query.id,
        String(request.user.sub)
      )

    return reply.send(purchases)
  }

  //
  // GET BY ID
  //

  async getById(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    const params =
      purchaseIdSchema.parse(
        request.params
      )

    const purchase =
      await purchaseService.getById({
        id: params.id,

        userId: String(
          request.user.sub
        ),
      })

    return reply.send(purchase)
  }

  //
  // CANCEL
  //

  async cancel(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    const params =
      purchaseIdSchema.parse(
        request.params
      )

    const result =
      await purchaseService.cancel({
        id: params.id,

        userId: String(
          request.user.sub
        ),
      })

    return reply.send(result)
  }
}