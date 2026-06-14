import { FastifyInstance }
  from 'fastify'

import { ZodTypeProvider }
  from 'fastify-type-provider-zod'

import { AuthController }
  from './auth.controller.js'

import {
  loginSchema,
  registerSchema,
  loginResponseSchema,
  registerResponseSchema,
} from './auth.schema.js'

import {
  unauthorizedResponseSchema,
  validationResponseSchema,
  conflictResponseSchema,
  internalServerResponseSchema,
} from '../../infra/http/swagger/response.schemas.js'

const authController =
  new AuthController()

export async function authRoutes(
  app: FastifyInstance
) {
  const zodApp =
    app.withTypeProvider<ZodTypeProvider>()

  //
  // REGISTER
  //

  zodApp.post(
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
          201:
            registerResponseSchema,

          409:
            conflictResponseSchema,

          422:
            validationResponseSchema,

          500:
            internalServerResponseSchema,
        },
      },
    },

    authController.register
  )

  //
  // LOGIN
  //

  zodApp.post(
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
          200:
            loginResponseSchema,

          401:
            unauthorizedResponseSchema,

          422:
            validationResponseSchema,

          500:
            internalServerResponseSchema,
        },
      },
    },

    authController.login
  )
}