// shared/swagger/success.schemas.ts

import { z } from 'zod'

export function successResponseSchema<
  T extends z.ZodTypeAny
>(
  schema: T
) {
  return z.object({
    success: z.literal(true),

    data: schema,
  })
}