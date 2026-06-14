import {
  FastifyReply,
  FastifyRequest,
} from 'fastify'

import { z } from 'zod'

import { CardService }
  from './card.service.js'

import {
  addUserToCardSchema,
  createCreditCardSchema,
  updateCreditCardSchema,
} from './card.schemas.js'

const cardService =
  new CardService()

export class CardController {
  //
  // CREATE CARD
  //

  async create(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    const body =
      createCreditCardSchema.parse(
        request.body
      )

    const card =
      await cardService.create({
        ...body,

        ownerId: String(
          request.user.sub
        ),
      })

    return reply
      .status(201)
      .send({
        success: true,
        data: card,
      })
  }

  //
  // ADD USER TO CARD
  //

  async addUser(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    const params = z
      .object({
        cardId: z.string().uuid(),
      })
      .parse(request.params)

    const body =
      addUserToCardSchema.parse(
        request.body
      )

    const result =
      await cardService.addUserToCard({
        ownerId: String(
          request.user.sub
        ),

        creditCardId:
          params.cardId,

        userEmail:
          body.userEmail,

        limitGranted:
          body.limitGranted,
      })

    return reply
      .status(201)
      .send({
        success: true,
        data: result,
      })
  }

  //
  // LIST CARDS
  //

  async list(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    const cards =
      await cardService.listCards(
        String(
          request.user.sub
        )
      )

    return reply.send({
      success: true,
      data: cards,
    })
  }

  //
  // GET CARD BY ID
  //

  async getById(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    const params = z
      .object({
        cardId: z.string().uuid(),
      })
      .parse(request.params)

    const card =
      await cardService.getCardById({
        userId: String(
          request.user.sub
        ),

        creditCardId:
          params.cardId,
      })

    return reply.send({
      success: true,
      data: card,
    })
  }

  //
  // UPDATE CARD
  //

  async update(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    const params = z
      .object({
        cardId: z.string().uuid(),
      })
      .parse(request.params)

    const body =
      updateCreditCardSchema.parse(
        request.body
      )

    const card =
      await cardService.updateCard({
        ownerId: String(
          request.user.sub
        ),

        creditCardId:
          params.cardId,

        ...body,
      })

    return reply.send({
      success: true,
      data: card,
    })
  }

  //
  // CARD USERS
  //

  async getUsers(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    const params = z
      .object({
        cardId: z.string().uuid(),
      })
      .parse(request.params)

    const users =
      await cardService.getCardUsers({
        requesterId: String(
          request.user.sub
        ),

        creditCardId:
          params.cardId,
      })

    return reply.send({
      success: true,
      data: users,
    })
  }
}