import { FastifyInstance }
  from 'fastify'

import { authMiddleware }
  from '../../shared/middlewares/auth.middleware.js'

import { PurchaseController }
  from './purchase.controller.js'

const purchaseController =
  new PurchaseController()

export async function purchaseRoutes(
  app: FastifyInstance
) {
  //
  // CREATE
  //

  app.post(
    '/purchases',
    {
      preHandler: [authMiddleware],
    },
    purchaseController.create
  )

  //
  // LIST
  //

  app.get(
    '/purchases',
    {
      preHandler: [authMiddleware],
    },
    purchaseController.list
  )

  //
  // DETAILS
  //

  app.get(
    '/purchases/:id',
    {
      preHandler: [authMiddleware],
    },
    purchaseController.getById
  )

  //
  // CANCEL
  //

  app.patch(
    '/purchases/:id/cancel',
    {
      preHandler: [authMiddleware],
    },
    purchaseController.cancel
  )
}