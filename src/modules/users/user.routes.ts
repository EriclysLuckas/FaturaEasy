import { FastifyInstance } from 'fastify'

import { authMiddleware } from '../../shared/middlewares/auth.middleware.js'

import { UserController } from './user.controller.js'

const userController = new UserController()

export async function userRoutes(
  app: FastifyInstance
) {
  app.get(
    '/me',
    {
      preHandler: [authMiddleware],
    },
    userController.me
  )
}