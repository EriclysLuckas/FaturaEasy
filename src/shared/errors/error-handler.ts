import {
  FastifyError,
  FastifyReply,
  FastifyRequest,
} from 'fastify'

import { ZodError } from 'zod'

import { AppError } from './app-error.js'

export async function errorHandler(
  error: FastifyError | Error,
  request: FastifyRequest,
  reply: FastifyReply
) {
  //
  // 🔥 APP ERROR
  //

  if (error instanceof AppError) {
    return reply.status(
      error.statusCode
    ).send({
      success: false,

      error: {
        message:
          error.message,

        code:
          error.code,

        statusCode:
          error.statusCode,
      },
    })
  }

  //
  // 🔥 ZOD ERROR
  //

  if (error instanceof ZodError) {
    return reply.status(422).send({
      success: false,

      error: {
        message:
          'Validation error',

        code:
          'VALIDATION_ERROR',

        statusCode: 422,

        fields:
          error.flatten().fieldErrors,
      },
    })
  }

  //
  // 🔥 INTERNAL ERROR
  //

  console.error(error)

  return reply.status(500).send({
    success: false,

    error: {
      message:
        'Internal server error',

      code:
        'INTERNAL_SERVER_ERROR',

      statusCode: 500,
    },
  })
}