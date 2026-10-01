
import {
  Prisma,
} from '@prisma/client'

export class CreditCardLock {
  async execute(
    tx: Prisma.TransactionClient,
    creditCardId: string
  ) {
    await tx.$queryRaw`
      SELECT id
      FROM "CreditCard"
      WHERE id = ${creditCardId}
      FOR UPDATE
    `
  }
}

