import {
  FastifyReply,
  FastifyRequest,
} from 'fastify'

export class UserController {
  async me(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    return reply.send({
      userId: request.user.sub,
    })
  }
}