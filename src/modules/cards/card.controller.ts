import {
  FastifyReply,
  FastifyRequest,
} from 'fastify'

import { z } from 'zod'

import { CardService } from './card.service.js'

import {
  addUserToCardSchema,
  createCreditCardSchema,
  updateCreditCardSchema,
} from './card.schemas.js'

const cardService =
  new CardService()

export class CardController {
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
      .send(card)
  }

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
      await cardService.addUserToCard(
        {
          ownerId: String(
            request.user.sub
          ),
          creditCardId:
            params.cardId,

          userEmail:
            body.userEmail,

          limitGranted:
            body.limitGranted,
        }
      )
          console.log(request.user)

    return reply
      .status(201)
      .send(result)
  }
  async list(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const cards =
    await cardService.listCards(
      String(request.user.sub)
    )

  return reply.send(cards)
}

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

  return reply.send(card)
}

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

  return reply.send(card)
}
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

  return reply.send(users)
}
}
