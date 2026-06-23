import {
  FastifyReply,
  FastifyRequest,
} from 'fastify'

import { PurchaseService }
  from './purchase.service.js'

import {
  createPurchaseSchema,
  purchaseIdParamsSchema,
  listPurchasesQuerySchema,
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
      .send({
        success: true,

        data: {
          ...purchase,

          amount: Number(
            purchase.amount
          ),
        },
      })
  }

  //
  // LIST
  //

  async list(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    const query =
      listPurchasesQuerySchema.parse(
        request.query
      )

    const purchases =
      await purchaseService.list({
        userId: String(
          request.user.sub
        ),

        creditCardId:
          query.creditCardId,

        month:
          query.month,

        year:
          query.year,
      })

    return reply.send({
      success: true,

      data: purchases,
    })
  }

  //
  // GET BY ID
  //

  async getById(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    const params =
      purchaseIdParamsSchema.parse(
        request.params
      )

    const purchase =
      await purchaseService.getById({
        id: params.id,

        userId: String(
          request.user.sub
        ),
      })

    return reply.send({
      success: true,

      data: purchase,
    })
  }

  //
  // CANCEL
  //

  async cancel(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    const params =
      purchaseIdParamsSchema.parse(
        request.params
      )

    const result =
      await purchaseService.cancel({
        id: params.id,

        userId: String(
          request.user.sub
        ),
      })

    return reply.send({
      success: true,

      data: result,
    })
  }
}