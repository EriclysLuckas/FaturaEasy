import { FastifyInstance }
  from 'fastify'

import { AuthController }
  from './auth.controller.js'

import {
  loginSchema,
  registerSchema,
} from './auth.schema.js'

const authController =
  new AuthController()

export async function authRoutes(
  app: FastifyInstance
) {
  app.post(
    '/register',
    {
      schema: {
        tags: ['Auth'],

        summary:
          'Cria uma nova conta',

        description:
          'Realiza cadastro de usuário',

        body:
          registerSchema,

        response: {
          201: {
            type: 'object',

            properties: {
              id: {
                type: 'string',
              },

              name: {
                type: 'string',
              },

              email: {
                type: 'string',
              },
            },
          },
        },
      },
    },

    authController.register
  )

  app.post(
    '/login',
    {
      schema: {
        tags: ['Auth'],

        summary:
          'Autentica usuário',

        description:
          'Retorna JWT',

        body:
          loginSchema,

        response: {
          200: {
            type: 'object',

            properties: {
              token: {
                type: 'string',
              },
            },
          },
        },
      },
    },

    authController.login
  )
}