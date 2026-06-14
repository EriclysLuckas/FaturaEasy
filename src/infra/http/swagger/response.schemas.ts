import { z } from 'zod'

import { errorResponseSchema }
  from '../../../shared/errors/error.schema.js'    

//
// SUCESSO GENÉRICO
//

export const successMessageSchema =
  z.object({
    success: z.literal(true),

    message: z.string(),
  })

//
// ERROS
//

export const badRequestResponseSchema =
  errorResponseSchema

export const unauthorizedResponseSchema =
  errorResponseSchema

export const forbiddenResponseSchema =
  errorResponseSchema

export const notFoundResponseSchema =
  errorResponseSchema

export const conflictResponseSchema =
  errorResponseSchema

export const validationResponseSchema =
  errorResponseSchema

export const internalServerResponseSchema =
  errorResponseSchema