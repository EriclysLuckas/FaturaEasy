import { app } from '../app.js'
import jwt from '@fastify/jwt'
import { env } from './env.js'

app.register(jwt, {
  secret: env.jwtSecret
})
