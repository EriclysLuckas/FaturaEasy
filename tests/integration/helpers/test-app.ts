import { execSync } from 'node:child_process'
import dotenv from 'dotenv'
import type { FastifyInstance } from 'fastify'
import { vi } from 'vitest'

// ---------------------------------------------------------------------------
// Evita que o scheduler de cron jobs (fechamento automático de faturas, etc.)
// rode em paralelo durante os testes de integração e feche/altere faturas
// no meio de uma asserção. O app.ts chama startScheduler() no top-level ao
// ser importado, então isso precisa ser mockado ANTES do import dinâmico
// do app mais abaixo.
// ---------------------------------------------------------------------------
vi.mock('../../../src/jobs/scheduler.js', () => ({
  startScheduler: () => {
    // no-op em testes de integração
  },
}))

export interface TestAppContext {
  app: FastifyInstance
  prisma: any
}

/**
 * Usa o Postgres de teste já existente via docker-compose (.env.test,
 * porta 5433) em vez de subir um container descartável. Como esse banco é
 * persistente entre execuções, limpamos as tabelas no início da suíte para
 * garantir um estado conhecido.
 */
export async function setupTestApp(): Promise<TestAppContext> {
  // Carrega .env.test SEM sobrescrever variáveis já definidas no ambiente
  // (comportamento padrão do dotenv) — assim, se alguém rodar com
  // DATABASE_URL já setado manualmente (ex: no CI), isso continua valendo.
  dotenv.config({ path: '.env.test' })

  const databaseUrl = process.env.DATABASE_URL_TEST

  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL_TEST não encontrada. Confirme que o arquivo .env.test existe na raiz do projeto e define essa variável.'
    )
  }

  process.env.DATABASE_URL = databaseUrl

  process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret-integration'

  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'inherit',
  })

  // Import dinâmico: precisa acontecer DEPOIS do DATABASE_URL estar setado,
  // porque `src/infra/database/prisma.ts` provavelmente instancia o
  // PrismaClient no top-level do módulo.
  const { app } = await import('../../../src/app.js')
  const { prisma } = await import('../../../src/infra/database/prisma.js')

  await app.ready()

  await cleanDatabase(prisma)

  return { app, prisma }
}

/**
 * Limpa todas as tabelas relevantes (ordem não importa por causa do CASCADE).
 * ⚠️ Assunção: os nomes das tabelas no Postgres são iguais aos nomes dos
 * models do schema.prisma (não há nenhum @@map definido no schema que você
 * mandou, então isso deve bater). Se algum model tiver @@map, ajuste os
 * nomes entre aspas abaixo.
 */
export async function cleanDatabase(prisma: any): Promise<void> {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "PurchaseInstallment",
      "Purchase",
      "Invoice",
      "CreditCardUser",
      "CreditCard",
      "User"
    RESTART IDENTITY CASCADE;
  `)
}

export async function teardownTestApp(app: FastifyInstance, prisma?: any): Promise<void> {
  if (prisma) {
    await cleanDatabase(prisma)
  }
  await app.close()
}