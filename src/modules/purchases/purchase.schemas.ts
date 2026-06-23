import { z } from 'zod'

//
// REQUESTS
//

export const createPurchaseSchema =
  z.object({
    description:
      z.string().min(2),

    amount:
      z.number().positive(),

    installments:
      z.number()
        .int()
        .min(1)
        .max(24),

    purchaseDate:
      z.coerce.date(),

    creditCardId:
      z.string().uuid(),
  })

export const purchaseIdParamsSchema =
  z.object({
    id:
      z.string().uuid(),
  })

export const listPurchasesQuerySchema =
  z.object({
    creditCardId:
      z.string().uuid(),

    month:
      z.coerce.number().optional(),

    year:
      z.coerce.number().optional(),
  })

//
// RESPONSES
//

export const purchaseInstallmentResponseSchema =
  z.object({
    id:
      z.string().uuid(),

    installmentNumber:
      z.number(),

    amount:
      z.number(),

    competenceMonth:
      z.number(),

    competenceYear:
      z.number(),

    status:
      z.string(),

    createdAt:
      z.date(),
  })

export const purchaseResponseSchema =
  z.object({
    id:
      z.string().uuid(),

    description:
      z.string(),

    amount:
      z.number(),

    installments:
      z.number(),

    purchaseDate:
      z.date(),

    userId:
      z.string().uuid(),

    creditCardId:
      z.string().uuid(),

    createdAt:
      z.date(),
  })

export const purchaseDetailsResponseSchema =
  z.object({
    id:
      z.string().uuid(),

    description:
      z.string(),

    amount:
      z.number(),

    installments:
      z.number(),

    purchaseDate:
      z.date(),

    createdAt:
      z.date(),

    user: z.object({
      id:
        z.string().uuid(),

      name:
        z.string(),

      email:
        z.string().email(),
    }),

    creditCard: z.object({
      id:
        z.string().uuid(),

      name:
        z.string(),
    }),

    installmentsData:
      z.array(
        purchaseInstallmentResponseSchema
      ),
  })

export const purchaseListResponseSchema =
  z.array(
    purchaseResponseSchema
  )

export const cancelPurchaseResponseSchema =
  z.object({
    message:
      z.string(),
  })