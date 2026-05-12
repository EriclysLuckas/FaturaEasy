import { FastifyInstance } from 'fastify'

import { authMiddleware } from '../../shared/middlewares/auth.middleware.js'

import { PurchaseController } from './purchase.controller.js'

const purchaseController =
  new PurchaseController()

export async function purchaseRoutes(
  app: FastifyInstance
) {
  app.post(
    '/purchases',
    {
      preHandler: [authMiddleware],
    },
    purchaseController.create
  )
}