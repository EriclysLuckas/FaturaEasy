
import { Prisma } from '@prisma/client'

export function toCents(
    value: number | Prisma.Decimal
): number {
    const decimal =
        new Prisma.Decimal(value)

    return decimal
        .mul(100)
        .toNumber()
}
