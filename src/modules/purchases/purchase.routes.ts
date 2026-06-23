import { FastifyInstance } from 'fastify'

import { ZodTypeProvider }
  from 'fastify-type-provider-zod'

import { authMiddleware }
  from '../../shared/middlewares/auth.middleware.js'

import { PurchaseController }
  from './purchase.controller.js'

import {
  createPurchaseSchema,
  purchaseIdParamsSchema,
  listPurchasesQuerySchema,

  purchaseResponseSchema,
  purchaseDetailsResponseSchema,
  purchaseListResponseSchema,
  cancelPurchaseResponseSchema,
} from './purchase.schemas.js'

import {
  successResponseSchema,
} from '../../infra/http/swagger/schemas/success.schemas.js'

import {
  unauthorizedResponseSchema,
  forbiddenResponseSchema,
  validationResponseSchema,
  notFoundResponseSchema,
  internalServerResponseSchema,
} from '../../infra/http/swagger/response.schemas.js'

const purchaseController =
  new PurchaseController()

export async function purchaseRoutes(
  app: FastifyInstance
) {
  const zodApp =
    app.withTypeProvider<ZodTypeProvider>()

  //
  // CREATE PURCHASE
  //

  zodApp.post(
    '/purchases',
    {
      preHandler: [authMiddleware],

      schema: {
        tags: ['Purchases'],

        summary:
          'Criar compra',

        description:
          'Cria uma compra parcelada vinculada a um cartão',

        security: [
          {
            bearerAuth: [],
          },
        ],

        body:
          createPurchaseSchema,

        response: {
          201:
            successResponseSchema(
              purchaseResponseSchema
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

    purchaseController.create
  )

  //
  // LIST PURCHASES
  //

  zodApp.get(
    '/purchases',
    {
      preHandler: [authMiddleware],

      schema: {
        tags: ['Purchases'],

        summary:
          'Listar compras',

        description:
          'Lista compras de um cartão',

        security: [
          {
            bearerAuth: [],
          },
        ],

        querystring:
          listPurchasesQuerySchema,

        response: {
          200:
            successResponseSchema(
              purchaseListResponseSchema
            ),

          401:
            unauthorizedResponseSchema,

          403:
            forbiddenResponseSchema,

          422:
            validationResponseSchema,

          500:
            internalServerResponseSchema,
        },
      },
    },

    purchaseController.list
  )

  //
  // GET PURCHASE
  //

  zodApp.get(
    '/purchases/:id',
    {
      preHandler: [authMiddleware],

      schema: {
        tags: ['Purchases'],

        summary:
          'Buscar compra',

        description:
          'Retorna os detalhes de uma compra',

        security: [
          {
            bearerAuth: [],
          },
        ],

        params:
          purchaseIdParamsSchema,

        response: {
          200:
            successResponseSchema(
              purchaseDetailsResponseSchema
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

    purchaseController.getById
  )

  //
  // CANCEL PURCHASE
  //

  zodApp.patch(
    '/purchases/:id/cancel',
    {
      preHandler: [authMiddleware],

      schema: {
        tags: ['Purchases'],

        summary:
          'Cancelar compra',

        description:
          'Cancela uma compra e suas parcelas futuras',

        security: [
          {
            bearerAuth: [],
          },
        ],

        params:
          purchaseIdParamsSchema,

        response: {
          200:
            successResponseSchema(
              cancelPurchaseResponseSchema
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

    purchaseController.cancel
  )
}