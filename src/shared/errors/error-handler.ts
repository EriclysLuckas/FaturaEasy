import { FastifyReply, FastifyRequest } from 'fastify'

import { ZodError } from 'zod'

export async function errorHandler(
  error: Error,
  request: FastifyRequest,
  reply: FastifyReply
) {
  if (error instanceof ZodError) {
    return reply.status(400).send({
      message: 'Validation error',
      errors: error.flatten().fieldErrors,
    })
  }

  return reply.status(500).send({
    message: error.message,
  })
}