
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { setupTestApp, teardownTestApp } from './test-app.js'
import { registerAndLogin, authHeader, type TestUser } from './auth.js'

/**
 * Teste de integração da cadeia principal:
 *
 * cartão → usuário → compra → cancelamento → consulta da fatura
 * → fechamento da fatura → pagamento
 *
 * A suíte utiliza um Postgres real de testes.
 *
 * Cada `it()` depende do estado criado pelo teste anterior.
 * Isso é intencional: o objetivo aqui é validar o fluxo de negócio
 * completo, e não testar cada operação de forma isolada.
 */
describe('Fluxo completo: cartão → usuário → compra → fatura → pagamento', () => {
  let app: FastifyInstance
  let prisma: any

  let owner: TestUser
  let sharedUser: TestUser

  let cardId: string
  let mainPurchaseId: string
  let cancelablePurchaseId: string
  let invoiceId: string

  // Data de referência fixa para toda a suíte.
  //
  // O cartão utilizado no teste possui closingDay = 31.
  // Dessa forma, a compra realizada durante o mês corrente
  // permanece na competência do próprio mês.
  const referenceDate = new Date()
  const referenceMonth = referenceDate.getMonth() + 1
  const referenceYear = referenceDate.getFullYear()

  beforeAll(async () => {
    const context = await setupTestApp()

    app = context.app
    prisma = context.prisma
  })

  afterAll(async () => {
    await teardownTestApp(app, prisma)
  })

  // =========================================================================
  // 1 — Criar cartão
  // =========================================================================
  it('1 - Deve criar um cartão de crédito', async () => {
    owner = await registerAndLogin(app, {
      name: 'Dono do Cartão',
    })

    const response = await app.inject({
      method: 'POST',
      url: '/cards',
      headers: authHeader(owner.token),
      payload: {
        name: 'Cartão de Integração',
        totalLimit: 5000,
        closingDay: 31,
        dueDay: 10,
      },
    })

    expect(response.statusCode).toBeLessThan(300)

    const body = response.json()

    cardId = body?.data?.id ?? body?.id

    expect(cardId).toBeTruthy()

    const cardInDb = await prisma.creditCard.findUnique({
      where: {
        id: cardId,
      },
    })

    expect(cardInDb).not.toBeNull()
    expect(Number(cardInDb.totalLimit)).toBe(5000)
    expect(cardInDb.ownerId).toBe(owner.id)
  })

  // =========================================================================
  // 2 — Adicionar usuário ao cartão
  // =========================================================================
  it('2 - Deve adicionar um segundo usuário ao cartão com limite individual', async () => {
    sharedUser = await registerAndLogin(app, {
      name: 'Usuário Compartilhado',
    })

    const response = await app.inject({
      method: 'POST',
      url: `/cards/${cardId}/users`,
      headers: authHeader(owner.token),
      payload: {
        userEmail: sharedUser.email,
        limitGranted: 2000,
      },
    })

    expect(response.statusCode).toBeLessThan(300)

    const link = await prisma.creditCardUser.findUnique({
      where: {
        userId_creditCardId: {
          userId: sharedUser.id,
          creditCardId: cardId,
        },
      },
    })

    expect(link).not.toBeNull()
    expect(Number(link.limitGranted)).toBe(2000)
  })

  // =========================================================================
  // 3 — Criar compra parcelada
  //
  // Purchase
  //   ↓
  // PurchaseInstallment
  //   ↓
  // competência mensal
  //   ↓
  // Invoice
  // =========================================================================
  it('3 - Deve criar uma compra parcelada, gerando suas parcelas e a invoice da competência', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/purchases',
      headers: authHeader(sharedUser.token),
      payload: {
        creditCardId: cardId,
        description: 'Compra de integração (principal)',
        amount: 300,
        installments: 3,
        purchaseDate: referenceDate.toISOString(),
      },
    })

    expect(response.statusCode).toBeLessThan(300)

    const body = response.json()

    mainPurchaseId = body?.data?.id ?? body?.id

    expect(mainPurchaseId).toBeTruthy()

    // -----------------------------------------------------------------------
    // Purchase → 3 parcelas
    // -----------------------------------------------------------------------
    const purchaseInstallments =
      await prisma.purchaseInstallment.findMany({
        where: {
          purchaseId: mainPurchaseId,
        },
        orderBy: {
          installmentNumber: 'asc',
        },
      })

    expect(purchaseInstallments).toHaveLength(3)

    expect(
      purchaseInstallments.every(
        (installment: any) => installment.status === 'PENDING'
      )
    ).toBe(true)

    // -----------------------------------------------------------------------
    // Valor total das parcelas = valor original da compra
    // -----------------------------------------------------------------------
    const totalInstallments = purchaseInstallments.reduce(
      (acc: number, installment: any) =>
        acc + Number(installment.amount),
      0
    )

    expect(totalInstallments).toBeCloseTo(300, 2)

    // -----------------------------------------------------------------------
    // Cada parcela deve possuir sua competência correta.
    //
    // Como a compra é de R$300 em 3x:
    //
    // Parcela 1 → competência atual
    // Parcela 2 → mês seguinte
    // Parcela 3 → dois meses depois
    // -----------------------------------------------------------------------

    const firstInstallment = purchaseInstallments[0]
    const secondInstallment = purchaseInstallments[1]
    const thirdInstallment = purchaseInstallments[2]

    expect(firstInstallment.competenceMonth).toBe(referenceMonth)
    expect(firstInstallment.competenceYear).toBe(referenceYear)

    const expectedSecondCompetence = new Date(
      referenceYear,
      referenceMonth,
      1
    )

    expect(secondInstallment.competenceMonth).toBe(
      expectedSecondCompetence.getMonth() + 1
    )

    expect(secondInstallment.competenceYear).toBe(
      expectedSecondCompetence.getFullYear()
    )

    const expectedThirdCompetence = new Date(
      referenceYear,
      referenceMonth + 1,
      1
    )

    expect(thirdInstallment.competenceMonth).toBe(
      expectedThirdCompetence.getMonth() + 1
    )

    expect(thirdInstallment.competenceYear).toBe(
      expectedThirdCompetence.getFullYear()
    )

    // -----------------------------------------------------------------------
    // Competência atual → Invoice
    // -----------------------------------------------------------------------
    const invoice = await prisma.invoice.findUnique({
      where: {
        creditCardId_month_year: {
          creditCardId: cardId,
          month: referenceMonth,
          year: referenceYear,
        },
      },
    })

    expect(invoice).not.toBeNull()
    expect(invoice.status).toBe('OPEN')

    invoiceId = invoice.id
  })

  // =========================================================================
  // 4 — Cancelar compra
  //
  // O cancelamento deve:
  //
  // Purchase
  //   ↓
  // parcelas → CANCELED
  //
  // E as parcelas canceladas não devem mais compor a fatura.
  // =========================================================================
  it('4 - Deve cancelar uma compra, marcando suas parcelas como CANCELED', async () => {
    const createResponse = await app.inject({
      method: 'POST',
      url: '/purchases',
      headers: authHeader(sharedUser.token),
      payload: {
        creditCardId: cardId,
        description: 'Compra a ser cancelada',
        amount: 100,
        installments: 1,
        purchaseDate: referenceDate.toISOString(),
      },
    })

    expect(createResponse.statusCode).toBeLessThan(300)

    cancelablePurchaseId =
      createResponse.json()?.data?.id ??
      createResponse.json()?.id

    expect(cancelablePurchaseId).toBeTruthy()

    const cancelResponse = await app.inject({
      method: 'PATCH',
      url: `/purchases/${cancelablePurchaseId}/cancel`,
      headers: authHeader(owner.token),
    })

    expect(cancelResponse.statusCode).toBeLessThan(300)

    const canceledInstallments =
      await prisma.purchaseInstallment.findMany({
        where: {
          purchaseId: cancelablePurchaseId,
        },
      })

    expect(canceledInstallments.length).toBeGreaterThan(0)

    expect(
      canceledInstallments.every(
        (installment: any) => installment.status === 'CANCELED'
      )
    ).toBe(true)

    // A invoice continua aberta.
    //
    // A compra cancelada não deve ser considerada como valor pendente
    // da invoice.
    const invoiceAfterCancel = await prisma.invoice.findUnique({
      where: {
        id: invoiceId,
      },
    })

    expect(invoiceAfterCancel?.status).toBe('OPEN')
  })

  // =========================================================================
  // 5 — Consultar invoice
  //
  // A invoice da competência atual deve conter somente:
  //
  // - parcela 1 da compra principal → R$100
  //
  // A compra cancelada não deve aparecer.
  // =========================================================================
  it('5 - Deve consultar a invoice e refletir somente as parcelas pendentes da competência', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/cards/${cardId}/invoices/${referenceYear}/${referenceMonth}`,
      headers: authHeader(sharedUser.token),
    })

    expect(response.statusCode).toBeLessThan(300)

    const body = response.json()

    expect(body.success).toBe(true)
    expect(body.data).toBeTruthy()

    const invoice = body.data.invoice
    const installments = body.data.installments

    expect(invoice.id).toBe(invoiceId)
    expect(invoice.status).toBe('OPEN')

    // A invoice atual possui somente a primeira parcela da compra
    // principal.
    expect(installments).toHaveLength(1)

    expect(installments[0].amount).toBe(100)
    expect(installments[0].installmentNumber).toBe(1)
    expect(installments[0].status).toBe('PENDING')

    expect(installments[0].purchase.id).toBe(mainPurchaseId)

    // O total da invoice deve ser R$100.
    expect(body.data.total).toBe(100)
  })

  // =========================================================================
  // 6 — Fechar invoice
  //
  // OPEN → CLOSED
  // =========================================================================
  it('6 - Deve fechar a invoice da competência, mudando o status para CLOSED', async () => {
    const { InvoiceCloseService } = await import(
      '../../../src/modules/invoices/invoice-close.service.js'
    )

    const closeService = new InvoiceCloseService()

    const result = await closeService.closeInvoice(
      cardId,
      referenceMonth,
      referenceYear
    )

    expect(result.status).toBe('CLOSED')

    const invoiceInDb = await prisma.invoice.findUnique({
      where: {
        id: invoiceId,
      },
    })

    expect(invoiceInDb?.status).toBe('CLOSED')
    expect(invoiceInDb?.closedAt).not.toBeNull()
  })

  // =========================================================================
  // 7 — Pagar invoice
  //
  // Payment recebe o invoiceId.
  //
  // A invoice identifica a competência.
  //
  // Somente as parcelas pertencentes àquela invoice são pagas.
  //
  // Neste cenário:
  //
  // Invoice atual
  //   └── Parcela 1 → R$100 → PAID
  //
  // Invoice seguinte
  //   └── Parcela 2 → R$100 → PENDING
  //
  // Invoice posterior
  //   └── Parcela 3 → R$100 → PENDING
  //
  // Portanto:
  //
  // totalPaid = 100
  // paidInstallments = 1
  // =========================================================================
  it('7 - Deve pagar a invoice fechada, quitando somente as parcelas pertencentes à invoice', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/invoices/${invoiceId}/pay`,
      headers: authHeader(owner.token),
    })

    expect(response.statusCode).toBeLessThan(300)

    const body = response.json()

    expect(body.success).toBe(true)
    expect(body.data).toBeTruthy()

    // -----------------------------------------------------------------------
    // Resposta do Payment
    // -----------------------------------------------------------------------
    expect(body.data.invoice.id).toBe(invoiceId)
    expect(body.data.invoice.status).toBe('PAID')
    expect(body.data.invoice.month).toBe(referenceMonth)
    expect(body.data.invoice.year).toBe(referenceYear)

    expect(body.data.totalPaid).toBe(100)
    expect(body.data.paidInstallments).toBe(1)

    // -----------------------------------------------------------------------
    // Invoice → PAID
    // -----------------------------------------------------------------------
    const invoiceInDb = await prisma.invoice.findUnique({
      where: {
        id: invoiceId,
      },
    })

    expect(invoiceInDb?.status).toBe('PAID')
    expect(invoiceInDb?.paidAt).not.toBeNull()

    // -----------------------------------------------------------------------
    // Parcelas da compra principal
    // -----------------------------------------------------------------------
    const purchaseInstallments =
      await prisma.purchaseInstallment.findMany({
        where: {
          purchaseId: mainPurchaseId,
        },
        orderBy: {
          installmentNumber: 'asc',
        },
      })

    expect(purchaseInstallments).toHaveLength(3)

    // Parcela da invoice paga → PAID.
    expect(purchaseInstallments[0].status).toBe('PAID')

    // Parcelas de invoices futuras → continuam PENDING.
    expect(purchaseInstallments[1].status).toBe('PENDING')
    expect(purchaseInstallments[2].status).toBe('PENDING')

    // -----------------------------------------------------------------------
    // Confirma que somente R$100 foi efetivamente pago.
    // -----------------------------------------------------------------------
    const paidInstallments = purchaseInstallments.filter(
      (installment: any) => installment.status === 'PAID'
    )

    expect(paidInstallments).toHaveLength(1)

    const totalPaid = paidInstallments.reduce(
      (acc: number, installment: any) =>
        acc + Number(installment.amount),
      0
    )

    expect(totalPaid).toBeCloseTo(100, 2)
  })
})
