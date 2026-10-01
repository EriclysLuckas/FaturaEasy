import type { Prisma } from '@prisma/client'

export class PurchaseLock {
    async execute(
        tx: Prisma.TransactionClient,
        purchaseId: string
    ) {
        await tx.$queryRaw`
            SELECT id
            FROM "Purchase"
            WHERE id = ${purchaseId}
            FOR UPDATE
        `
    }
}