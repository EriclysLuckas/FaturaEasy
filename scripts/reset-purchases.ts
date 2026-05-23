import { prisma } from '../src/infra/database/prisma'

async function main() {
  await prisma.purchaseInstallment.deleteMany()

  await prisma.purchase.deleteMany()

  console.log(
    '✅ Purchases e installments removidos'
  )
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
  })