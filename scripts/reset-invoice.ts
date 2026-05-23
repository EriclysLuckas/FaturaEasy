import { prisma } from '../src/infra/database/prisma.js'

async function resetInvoices() {
  console.log('🧹 Cleaning invoices...')

  await prisma.invoice.deleteMany()

  console.log('✅ Invoices cleaned')
}

resetInvoices()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
  })