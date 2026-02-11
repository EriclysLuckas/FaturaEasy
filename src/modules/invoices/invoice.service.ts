import { prisma } from "../../infra/database/prisma.js";
import { PermissionService } from "../permissions/permissions.service.js";

export class InvoiceService {
  private permissionService = new PermissionService();

  async getInvoice({
    userId,
    creditCardId,
    month,
    year,
  }: {
    userId: string;
    creditCardId: string;
    month: number;
    year: number;
  }) {
    //  Permissão
    const isOwner = await this.permissionService.isCardOwner(
      userId,
      creditCardId
    );

    const cardUser = await this.permissionService.isCardUser(
      userId,
      creditCardId
    );

    if (!isOwner && !cardUser) {
      throw new Error("Access denied");
    }

    //  Descobre período da fatura
    const card = await prisma.creditCard.findUnique({
      where: { id: creditCardId },
    });

    if (!card) {
      throw new Error("Card not found");
    }

    const startDate = new Date(year, month - 1, card.dueDay + 1);
    const endDate = new Date(year, month, card.dueDay);

    //  Busca compras
    const purchases = await prisma.purchase.findMany({
      where: {
        creditCardId,
        purchaseDate: {
          gte: startDate,
          lte: endDate,
        },
        ...(isOwner ? {} : { userId }),
      },
    });

    //  Total
    const total = purchases.reduce(
      (sum, purchase) => sum + Number(purchase.amount),
      0
    );

    return {
      month,
      year,
      total,
      purchases,
    };
  }
}
 