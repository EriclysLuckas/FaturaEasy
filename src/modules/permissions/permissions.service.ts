
import {
  Prisma,
} from '@prisma/client'

import { prisma }
  from '../../infra/database/prisma.js'

export class PermissionService {
  async isCardOwner(
    userId: string,
    creditCardId: string,
    db:
      | Prisma.TransactionClient
      | typeof prisma = prisma
  ) {
    const card =
      await db.creditCard.findUnique({
        where: {
          id: creditCardId,
        },
      })

    if (!card) {
      return false
    }

    return card.ownerId === userId
  }

  async isCardUser(
    userId: string,
    creditCardId: string,
    db:
      | Prisma.TransactionClient
      | typeof prisma = prisma
  ) {
    const link =
      await db.creditCardUser.findUnique({
        where: {
          userId_creditCardId: {
            userId,
            creditCardId,
          },
        },
      })

    return !!link
  }
}

