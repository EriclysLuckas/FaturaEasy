import { env } from './env.js'

export const jwtConfig = {
  secret: env.jwtSecret,

  sign: {
    expiresIn: '7d',
  },
}