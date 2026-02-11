import { prisma } from "../../infra/database/prisma.js";

export class PermissionService {
  async isCardOwner(userId: string, cardId: string) {
    const card = await prisma.creditCard.findUnique({
      where: { id: cardId },
      select: { ownerId: true },
    });

    return card?.ownerId === userId;
  }

  async isCardUser(userId: string, cardId: string) {
    return prisma.creditCardUser.findUnique({
      where: {
        userId_creditCardId: {
          userId,
          creditCardId: cardId,
        },
      },
    });
  }
}
