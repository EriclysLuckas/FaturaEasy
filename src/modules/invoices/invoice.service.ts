import { prisma } from "../../infra/database/prisma.js";
import { PermissionService } from "../permissions/permissions.service.js";
import { getInvoicePeriod } from "../../shared/utils/invoice-period.js";
import { Purchase } from "@prisma/client";

interface GetInvoiceInput {
  userId: string;
  creditCardId: string;
  month: number; // mês de vencimento
  year: number;
}

export class InvoiceService {
  private permissionService = new PermissionService();

  async getInvoice({
    userId,
    creditCardId,
    month,
    year,
  }: GetInvoiceInput) {
    // 🔐 1. Verificação de permissão
    const isOwner = await this.permissionService.isCardOwner(
      userId,
      creditCardId
    );

    const isCardUser = await this.permissionService.isCardUser(
      userId,
      creditCardId
    );

    if (!isOwner && !isCardUser) {
      throw new Error("Access denied");
    }

    const card = await prisma.creditCard.findUnique({
      where: { id: creditCardId },
      select: {
        id: true,
        name: true,
        dueDay: true,
        totalLimit: true,
      },
    });

    if (!card) {
      throw new Error("Card not found");
    }

    const { startDate, endDate } = getInvoicePeriod(
      year,
      month,
      card.dueDay
    );

    const purchases: Purchase[] = await prisma.purchase.findMany({
      where: {
        creditCardId,
        purchaseDate: {
          gte: startDate,
          lte: endDate,
        },
        ...(isOwner ? {} : { userId }),
      },
      orderBy: {
        purchaseDate: "asc",
      },
    });

    const total = purchases.reduce<number>(
      (sum, purchase) => sum + Number(purchase.amount),
      0
    );

    let totalsByUser: Record<string, number> | null = null;

    if (isOwner) {
      totalsByUser = purchases.reduce<Record<string, number>>(
        (acc, purchase) => {
          const key = purchase.userId;

          if (!acc[key]) {
            acc[key] = 0;
          }

          acc[key] += Number(purchase.amount);
          return acc;
        },
        {}
      );
    }

    return {
      card: {
        id: card.id,
        name: card.name,
        totalLimit: Number(card.totalLimit),
        dueDay: card.dueDay,
      },
      invoicePeriod: {
        startDate,
        endDate,
      },
      month,
      year,
      total,
      purchases,
      totalsByUser,
    };
  }
}
