import {
  FastifyError,
  FastifyReply,
  FastifyRequest,
} from 'fastify'

import {
  hasZodFastifySchemaValidationErrors,
} from 'fastify-type-provider-zod'

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
  // ZOD FIRST (Fastify + validatorCompiler)
  //

  if (
    hasZodFastifySchemaValidationErrors(
      error
    )
  ) {

    const fields =
      error.validation.reduce(
        (acc, issue) => {

          const field =
            issue.instancePath
              .replace('/', '')

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
      )

    return reply.status(422).send({
      success: false,

      error: {
        message:
          'Validation error',

        code:
          'VALIDATION_ERROR',

        statusCode: 422,

        fields,
      },
    })
  }

  //
  // APP ERROR
  //

  if (error instanceof AppError) {

    const payload = {
      success: false,

      error: {
        message:
          error.message,

        code:
          error.code,

        statusCode:
          error.statusCode,
      },
    }

    if (error.details) {
      Object.assign(
        payload.error,
        {
          fields:
            error.details,
        }
      )
    }

    return reply
      .status(error.statusCode)
      .send(payload)
  }

  //
  // ZOD ERROR (fallback)
  //

  if (error instanceof ZodError) {

    const fields =
      error.issues.reduce(
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
      )

    return reply.status(422).send({
      success: false,

      error: {
        message:
          'Validation error',

        code:
          'VALIDATION_ERROR',

        statusCode: 422,

        fields,
      },
    })
  }

  //
  // INTERNAL ERROR
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