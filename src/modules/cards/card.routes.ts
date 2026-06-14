import { FastifyInstance } from 'fastify'

import { ZodTypeProvider }
  from 'fastify-type-provider-zod'

import { authMiddleware }
  from '../../shared/middlewares/auth.middleware.js'

import { CardController }
  from './card.controller.js'

import {
  successResponseSchema,
} from '../../infra/http/swagger/schemas/success.schemas.js'

import {
  cardIdParamsSchema,

  createCreditCardSchema,
  addUserToCardSchema,
  updateCreditCardSchema,

  creditCardResponseSchema,
  creditCardDetailsResponseSchema,
  creditCardListResponseSchema,
  addUserToCardResponseSchema,
  cardUsersListResponseSchema,
} from './card.schemas.js'

import {
  unauthorizedResponseSchema,
  forbiddenResponseSchema,
  validationResponseSchema,
  notFoundResponseSchema,
  conflictResponseSchema,
  internalServerResponseSchema,
} from '../../infra/http/swagger/response.schemas.js'

const cardController =
  new CardController()

export async function cardRoutes(
  app: FastifyInstance
) {
  const zodApp =
    app.withTypeProvider<ZodTypeProvider>()

  //
  // CREATE CARD
  //

  zodApp.post(
    '/cards',
    {
      preHandler: [authMiddleware],

      schema: {
        tags: ['Cards'],

        summary:
          'Criar cartão',

        description:
          'Cria um novo cartão de crédito',

        security: [
          {
            bearerAuth: [],
          },
        ],

        body:
          createCreditCardSchema,

        response: {
          201:
            successResponseSchema(
              creditCardResponseSchema
            ),

          401:
            unauthorizedResponseSchema,

          422:
            validationResponseSchema,

          500:
            internalServerResponseSchema,
        },
      },
    },

    cardController.create
  )

  //
  // LIST CARDS
  //

  zodApp.get(
    '/cards',
    {
      preHandler: [authMiddleware],

      schema: {
        tags: ['Cards'],

        summary:
          'Listar cartões',

        description:
          'Lista todos os cartões vinculados ao usuário',

        security: [
          {
            bearerAuth: [],
          },
        ],

        response: {
          200:
            successResponseSchema(
              creditCardListResponseSchema
            ),

          401:
            unauthorizedResponseSchema,

          500:
            internalServerResponseSchema,
        },
      },
    },

    cardController.list
  )

  //
  // GET CARD
  //

  zodApp.get(
    '/cards/:cardId',
    {
      preHandler: [authMiddleware],

      schema: {
        tags: ['Cards'],

        summary:
          'Buscar cartão',

        description:
          'Retorna os detalhes de um cartão',

        security: [
          {
            bearerAuth: [],
          },
        ],

        params:
          cardIdParamsSchema,

        response: {
          200:
            successResponseSchema(
              creditCardDetailsResponseSchema
            ),

          401:
            unauthorizedResponseSchema,

          403:
            forbiddenResponseSchema,

          404:
            notFoundResponseSchema,

          500:
            internalServerResponseSchema,
        },
      },
    },

    cardController.getById
  )

  //
  // UPDATE CARD
  //

  zodApp.put(
    '/cards/:cardId',
    {
      preHandler: [authMiddleware],

      schema: {
        tags: ['Cards'],

        summary:
          'Atualizar cartão',

        description:
          'Atualiza os dados de um cartão',

        security: [
          {
            bearerAuth: [],
          },
        ],

        params:
          cardIdParamsSchema,

        body:
          updateCreditCardSchema,

        response: {
          200:
            successResponseSchema(
              creditCardResponseSchema
            ),

          401:
            unauthorizedResponseSchema,

          403:
            forbiddenResponseSchema,

          404:
            notFoundResponseSchema,

          422:
            validationResponseSchema,

          500:
            internalServerResponseSchema,
        },
      },
    },

    cardController.update
  )

  //
  // ADD USER
  //

  zodApp.post(
    '/cards/:cardId/users',
    {
      preHandler: [authMiddleware],

      schema: {
        tags: ['Cards'],

        summary:
          'Adicionar usuário ao cartão',

        description:
          'Vincula um usuário ao cartão e define limite',

        security: [
          {
            bearerAuth: [],
          },
        ],

        params:
          cardIdParamsSchema,

        body:
          addUserToCardSchema,

        response: {
          201:
            successResponseSchema(
              addUserToCardResponseSchema
            ),

          401:
            unauthorizedResponseSchema,

          403:
            forbiddenResponseSchema,

          404:
            notFoundResponseSchema,

          409:
            conflictResponseSchema,

          422:
            validationResponseSchema,

          500:
            internalServerResponseSchema,
        },
      },
    },

    cardController.addUser
  )

  //
  // LIST CARD USERS
  //

  zodApp.get(
    '/cards/:cardId/users',
    {
      preHandler: [authMiddleware],

      schema: {
        tags: ['Cards'],

        summary:
          'Listar usuários do cartão',

        description:
          'Lista os usuários vinculados ao cartão',

        security: [
          {
            bearerAuth: [],
          },
        ],

        params:
          cardIdParamsSchema,

        response: {
          200:
            successResponseSchema(
              cardUsersListResponseSchema
            ),

          401:
            unauthorizedResponseSchema,

          403:
            forbiddenResponseSchema,

          404:
            notFoundResponseSchema,

          500:
            internalServerResponseSchema,
        },
      },
    },

    cardController.getUsers
  )
}