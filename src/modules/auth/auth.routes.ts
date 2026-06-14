import { FastifyInstance } from 'fastify'

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
  successResponseSchema,
} from '../../infra/http/swagger/schemas/success.schemas.js'

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
          'Criar conta',

        description:
          'Realiza o cadastro de um novo usuário',

        body:
          registerSchema,

        response: {
          201:
            successResponseSchema(
              registerResponseSchema
            ),

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
          'Autenticar usuário',

        description:
          'Retorna um JWT válido para acesso à API',

        body:
          loginSchema,

        response: {
          200:
            successResponseSchema(
              loginResponseSchema
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

    authController.login
  )
}