// src/modules/invoices/invoice.routes.ts

import { FastifyInstance }
  from 'fastify'

import { ZodTypeProvider }
  from 'fastify-type-provider-zod'

import { authMiddleware }
  from '../../shared/middlewares/auth.middleware.js'

import { InvoiceController }
  from './invoice.controller.js'

import {
  getInvoiceParamsSchema,
  invoiceResponseSchema,
  emptyInvoiceResponseSchema,
} from './invoice.schemas.js'

import {
  successResponseSchema,
} from '../../infra/http/swagger/schemas/success.schemas.js'

import {
  unauthorizedResponseSchema,
  forbiddenResponseSchema,
  notFoundResponseSchema,
  internalServerResponseSchema,
} from '../../infra/http/swagger/response.schemas.js'

const invoiceController =
  new InvoiceController()

export async function invoiceRoutes(
  app: FastifyInstance
) {
  const zodApp =
    app.withTypeProvider<ZodTypeProvider>()

  //
  // GET INVOICE
  //

  zodApp.get(
    '/cards/:cardId/invoices/:year/:month',
    {
      preHandler: [authMiddleware],

      schema: {
        tags: ['Invoices'],

        summary:
          'Buscar fatura',

        description:
          'Retorna a fatura de um cartão para uma competência (mês/ano)',

        security: [
          {
            bearerAuth: [],
          },
        ],

        params:
          getInvoiceParamsSchema,

        response: {
          200:
            successResponseSchema(
              invoiceResponseSchema
                .or(
                  emptyInvoiceResponseSchema
                )
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

    invoiceController.getInvoice
  )
}