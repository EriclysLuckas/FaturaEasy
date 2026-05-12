import { FastifyInstance } from 'fastify'

import { authMiddleware } from '../../shared/middlewares/auth.middleware.js'

import { CardController } from './card.controller.js'


const creditCardController =
  new CardController()

export async function cardRoutes(
  app: FastifyInstance
) {
  // Criar cartão
  app.post(
    '/cards',
    {
      preHandler: [authMiddleware],
    },
    creditCardController.create
  )

  // Vincular usuário ao cartão
  app.post(
    '/cards/:cardId/users',
    {
      preHandler: [authMiddleware],
    },
    creditCardController.addUser
  )
}