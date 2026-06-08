import { FastifyInstance } from 'fastify'

import { authMiddleware } from '../../shared/middlewares/auth.middleware.js'

import { CardController } from './card.controller.js'


const creditCardController =
  new CardController()

export async function cardRoutes(
  app: FastifyInstance
) {
  //
  // criar cartão
  //

  app.post(
    '/cards',
    {
      preHandler: [authMiddleware],
    },
    creditCardController.create
  )

  //
  // listar cartões
  //

  app.get(
    '/cards',
    {
      preHandler: [authMiddleware],
    },
    creditCardController.list
  )

  //
  // buscar cartão
  //

  app.get(
    '/cards/:cardId',
    {
      preHandler: [authMiddleware],
    },
    creditCardController.getById
  )

  //
  // atualizar cartão
  //

  app.put(
    '/cards/:cardId',
    {
      preHandler: [authMiddleware],
    },
    creditCardController.update
  )

  //
  // vincular usuário
  //

  app.post(
    '/cards/:cardId/users',
    {
      preHandler: [authMiddleware],
    },
    creditCardController.addUser
  )
  app.get(
  '/cards/:cardId/users',
  {
    preHandler: [authMiddleware],
  },
  creditCardController.getUsers
)
}