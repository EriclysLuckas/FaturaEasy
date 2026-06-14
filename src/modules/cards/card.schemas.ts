import { z } from 'zod'

//
// PARAMS
//

export const cardIdParamsSchema =
  z.object({
    cardId: z.uuid(),
  })

//
// REQUESTS
//

export const createCreditCardSchema =
  z.object({
    name: z
      .string()
      .min(
        2,
        'Card name must have at least 2 characters'
      ),

    totalLimit: z
      .number()
      .positive(
        'Total limit must be greater than zero'
      ),

    closingDay: z
      .number()
      .min(
        1,
        'Closing day must be between 1 and 31'
      )
      .max(
        31,
        'Closing day must be between 1 and 31'
      ),

    dueDay: z
      .number()
      .min(
        1,
        'Due day must be between 1 and 31'
      )
      .max(
        31,
        'Due day must be between 1 and 31'
      ),
  })

export const addUserToCardSchema =
  z.object({
    userEmail: z
      .email(
        'Invalid email address'
      ),

    limitGranted: z
      .number()
      .positive(
        'Granted limit must be greater than zero'
      ),
  })

export const updateCreditCardSchema =
  z.object({
    name: z
      .string()
      .min(
        2,
        'Card name must have at least 2 characters'
      )
      .optional(),

    totalLimit: z
      .number()
      .positive(
        'Total limit must be greater than zero'
      )
      .optional(),

    closingDay: z
      .number()
      .min(
        1,
        'Closing day must be between 1 and 31'
      )
      .max(
        31,
        'Closing day must be between 1 and 31'
      )
      .optional(),

    dueDay: z
      .number()
      .min(
        1,
        'Due day must be between 1 and 31'
      )
      .max(
        31,
        'Due day must be between 1 and 31'
      )
      .optional(),
  })

//
// USERS
//

export const cardUserResponseSchema =
  z.object({
    id: z.string(),

    name: z.string(),

    email: z.string(),

    limitGranted: z.number(),
  })

//
// CARD BASE
//

export const creditCardResponseSchema =
  z.object({
    id: z.string(),

    name: z.string(),

    totalLimit: z.number(),

    closingDay: z.number(),

    dueDay: z.number(),

    ownerId: z.string(),
  })

//
// CARD DETAILS
//

export const creditCardDetailsResponseSchema =
  creditCardResponseSchema.extend({
    users: z.array(
      cardUserResponseSchema
    ),
  })

//
// CARD LIST
//

export const creditCardListResponseSchema =
  z.array(
    z.object({
      id: z.string(),

      name: z.string(),

      totalLimit: z.number(),

      closingDay: z.number(),

      dueDay: z.number(),

      ownerId: z.string(),

      yourLimit: z.number(),

      users: z.array(
        cardUserResponseSchema
      ),
    })
  )

//
// LINK USER
//

export const addUserToCardResponseSchema =
  z.object({
    userId: z.string(),

    creditCardId: z.string(),

    limitGranted: z.number(),
  })

//
// USERS LIST
//

export const cardUsersListResponseSchema =
  z.array(
    z.object({
      userId: z.string(),

      name: z.string(),

      email: z.string(),

      limitGranted: z.number(),

      joinedAt:
        z.coerce.date(),
    })
  )