import { z } from 'zod'

export const createCreditCardSchema = z.object({
  name: z.string().min(2),

  totalLimit: z.number().positive(),

  closingDay: z.number().min(1).max(31),

  dueDay: z.number().min(1).max(31),
})

export const addUserToCardSchema = z.object({
  userEmail: z.string().email(),

  limitGranted: z.number().positive(),
})

export const updateCreditCardSchema =
  z.object({
    name:
      z.string().min(2).optional(),

    totalLimit:
      z.number().positive().optional(),

    closingDay:
      z.number()
        .min(1)
        .max(31)
        .optional(),

    dueDay:
      z.number()
        .min(1)
        .max(31)
        .optional(),
  })