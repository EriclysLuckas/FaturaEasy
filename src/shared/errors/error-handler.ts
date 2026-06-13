import {
  FastifyError,
  FastifyReply,
  FastifyRequest,
} from 'fastify'

import { ZodError }
  from 'zod'

import { AppError }
  from './app-error.js'

export async function errorHandler(
  error: FastifyError | Error,
  request: FastifyRequest,
  reply: FastifyReply
) {
  //
  // APP ERROR
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

        fields:
          error.details ?? null,
      },
    })
  }

  //
  // ZOD ERROR
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

      fields: error.issues.reduce(
        (acc, issue) => {
          const field =
            issue.path.join('.')

          if (!acc[field]) {
            acc[field] = []
          }

          acc[field].push(
            issue.message
          )

          return acc
        },
        {} as Record<
          string,
          string[]
        >
      ),
    },
  })
}

  //
  // FASTIFY ERROR
  //

  if (
    'statusCode' in error &&
    error.statusCode === 400
  ) {
    return reply.status(400).send({
      success: false,

      error: {
        message:
          error.message,

        code:
          'BAD_REQUEST',

        statusCode: 400,
      },
    })
  }

  //
  // INTERNAL
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