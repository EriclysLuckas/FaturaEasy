import { prisma } from '../src/infra/database/prisma.js'

async function main() {
  const card = await prisma.creditCard.findUnique({
    where: {
      id: '70df3117-69c0-4a41-b677-631001444ea7',
    },

    select: {
      id: true,
      name: true,
      totalLimit: true,

      purchases: {
        select: {
          installmentsData: {
            where: {
              status: 'PENDING',
            },

            select: {
              amount: true,
            },
          },
        },
      },
    },
  })

  const usedLimit =
    card?.purchases.reduce(
      (purchaseAcc, purchase) => {
        const installmentsTotal =
          purchase.installmentsData.reduce(
            (installmentAcc, installment) =>
              installmentAcc +
              Number(installment.amount),
            0
          )

        return (
          purchaseAcc + installmentsTotal
        )
      },
      0
    ) ?? 0

  const availableLimit =
    Number(card?.totalLimit ?? 0) -
    usedLimit

  console.log({
    totalLimit: Number(card?.totalLimit),
    usedLimit,
    availableLimit,
  })
}

main()