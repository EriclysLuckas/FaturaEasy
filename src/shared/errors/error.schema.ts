import { z } from 'zod'

export const errorResponseSchema =
  z.object({
    success:
      z.literal(false),

    error:
      z.object({
        message:
          z.string(),

        code:
          z.string(),

        statusCode:
          z.number(),

        fields:
          z.record(
            z.string(),
            z.array(z.string())
          )
          .nullable()
          .optional(),
      }),
  })