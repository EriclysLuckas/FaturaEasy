import { prisma } from '../../infra/database/prisma.js'

export class PermissionService {
  async isCardOwner(
    userId: string,
    creditCardId: string
  ) {
    const card = await prisma.creditCard.findUnique({
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
  creditCardId: string
) {
  const link =
    await prisma.creditCardUser.findUnique({
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