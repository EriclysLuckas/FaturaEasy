import { FastifyReply, FastifyRequest } from 'fastify'

import { AuthService } from './auth.service.js'

import {
  loginSchema,
  registerSchema,
} from './auth.schema.js'

const authService = new AuthService()

export class AuthController {
  async register(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    const body = registerSchema.parse(request.body)

    const user = await authService.register(body)

    return reply.status(201).send(user)
  }

  async login(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    const body = loginSchema.parse(request.body)

    const user = await authService.login(body)

    const token = await reply.jwtSign(
        { 
         sub: user.id,
        },
     
    )

    return reply.send({
      token,
    })
  }
}