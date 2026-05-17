// src/modules/payments/payment.routes.ts

import { FastifyInstance } from 'fastify'

import { authMiddleware } from '../../shared/middlewares/auth.middleware.js'

import { PaymentController } from './payment.controller.js'

const paymentController =
  new PaymentController()

export async function paymentRoutes(
  app: FastifyInstance
) {
  app.post(
    '/invoices/:invoiceId/pay',
    {
      preHandler: [authMiddleware],
    },
    paymentController.payInvoice
  )
}