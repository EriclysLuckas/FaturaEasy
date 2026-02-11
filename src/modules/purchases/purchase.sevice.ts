import { prisma } from "../../infra/database/prisma.js";
import { PermissionService } from "../permissions/permissions.service.js";

interface CreatePurchaseInput {
  description: string;
  amount: number;
  installments: number;
  purchaseDate: Date;
  creditCardId: string;
  userId: string;
}

export class PurchaseService {
  private permissionService = new PermissionService();

  async create(data: CreatePurchaseInput) {
    // Verifica se o usuário tem acesso ao cartão
    const isOwner = await this.permissionService.isCardOwner(
      data.userId,
      data.creditCardId
    );

    const cardUser = await this.permissionService.isCardUser(
      data.userId,
      data.creditCardId
    );

    if (!isOwner && !cardUser) {
      throw new Error("Access denied");
    }

    // Regra de limite (somente para secundário)
    if (cardUser && data.amount > Number(cardUser.limitGranted)) {
      throw new Error("Limit exceeded");
    }

    // Criação da compra
    return prisma.purchase.create({
      data: {
        description: data.description,
        amount: data.amount,
        installments: data.installments,
        purchaseDate: data.purchaseDate,
        creditCardId: data.creditCardId,
        userId: data.userId,
      },
    });
  }
}
