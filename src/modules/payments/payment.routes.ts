// src/modules/payments/payment.routes.ts

import { FastifyInstance } from 'fastify'

import { authMiddleware }
  from '../../shared/middlewares/auth.middleware.js'

import { PaymentController }
  from './payment.controller.js'

import {
  payInvoiceParamsSchema,
  payInvoiceDataSchema,
} from './payment.schema.js'

import {
  errorResponseSchema,
} from '../../shared/errors/error.schema.js'

const paymentController =
  new PaymentController()

export async function paymentRoutes(
  app: FastifyInstance
) {
  app.post(
    '/invoices/:invoiceId/pay',
    {
      preHandler: [authMiddleware],

      schema: {
        tags: ['Payments'],

        summary: 'Pay invoice',

        description:
          'Allows only the card owner to pay a CLOSED invoice. Marks all pending installments as PAID.',

        security: [
          {
            bearerAuth: [],
          },
        ],

        params:
          payInvoiceParamsSchema,

        response: {
          200:
            payInvoiceDataSchema,

          400:
            errorResponseSchema,

          403:
            errorResponseSchema,

          404:
            errorResponseSchema,

          409:
            errorResponseSchema,

          500:
            errorResponseSchema,
        },
      },
    },

    paymentController.payInvoice
  )
}