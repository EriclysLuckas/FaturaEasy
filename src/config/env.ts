import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  PORT: z.coerce.number().default(3333),
  JWT_SECRET: z.string().min(1),
})

const _env = envSchema.safeParse(process.env)

if (!_env.success) {
  console.error(' Invalid environment variables', _env.error.format())
  throw new Error('Invalid environment variables')
}

export const env = {
  port: _env.data.PORT,
  jwtSecret: _env.data.JWT_SECRET,
}
