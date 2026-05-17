// src/modules/invoices/invoice.routes.ts

import { FastifyInstance } from 'fastify'

import { authMiddleware } from '../../shared/middlewares/auth.middleware.js'

import { InvoiceController } from './invoice.controller.js'

const invoiceController =
  new InvoiceController()

export async function invoiceRoutes(
  app: FastifyInstance
) {
  app.get(
    '/cards/:cardId/invoices/:year/:month',
    {
      preHandler: [authMiddleware],
    },
    invoiceController.getInvoice
  )
}