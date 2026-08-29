import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PaymentService } from './payment.service.js'
import { prisma } from '../../infra/database/prisma.js'
import { PermissionService } from '../permissions/permissions.service.js'
import { InvoiceLifecycleService } from '../invoices/invoice-lifecycle.service.js'
import { NotFoundError } from '../../shared/errors/not-found-error.js'
import { ForbiddenError } from '../../shared/errors/forbidden-error.js'
import {
  InvoiceNotClosedError,
  NoPendingInstallmentsError,
  InvoicePaidError,
} from '../../shared/errors/financial-erros.js'

vi.mock('../../infra/database/prisma', () => ({
  prisma: {
    invoice: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    purchaseInstallment: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

describe('PaymentService', () => {
  let service: PaymentService

  const baseInvoice = {
    id: 'invoice-id',
    month: 7,
    year: 2026,
    status: 'OPEN',
    paidAt: null,
    creditCardId: 'card-id',
    creditCard: {
      id: 'card-id',
      name: 'Nubank',
      closingDay: 10,
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    service = new PaymentService()
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
      return callback(prisma)
    })
  })

  // ---------------------------------------------------------------------
  // Existência da fatura
  // ---------------------------------------------------------------------

  it('Deve lançar NotFoundError quando a fatura não existir', async () => {
    vi.mocked(prisma.invoice.findUnique).mockResolvedValue(null)

    await expect(
      service.payInvoice({ invoiceId: 'invoice-id', userId: 'user-id' })
    ).rejects.toBeInstanceOf(NotFoundError)

    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  // ---------------------------------------------------------------------
  // Permissão: só o dono do cartão pode pagar
  // ---------------------------------------------------------------------

  it('Deve lançar ForbiddenError quando o usuário não for o dono do cartão', async () => {
    vi.mocked(prisma.invoice.findUnique).mockResolvedValue(baseInvoice as any)
    vi.spyOn(PermissionService.prototype, 'isCardOwner').mockResolvedValue(false)

    await expect(
      service.payInvoice({ invoiceId: 'invoice-id', userId: 'user-id' })
    ).rejects.toBeInstanceOf(ForbiddenError)

    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  // ---------------------------------------------------------------------
  // Fatura já paga
  // ---------------------------------------------------------------------

  it('Deve lançar InvoicePaidError quando a fatura já estiver com status PAID', async () => {
    vi.mocked(prisma.invoice.findUnique).mockResolvedValue({
      ...baseInvoice,
      status: 'PAID',
    } as any)
    vi.spyOn(PermissionService.prototype, 'isCardOwner').mockResolvedValue(true)
    const getInvoiceStatusSpy = vi.spyOn(
      InvoiceLifecycleService.prototype,
      'getInvoiceStatus'
    )

    await expect(
      service.payInvoice({ invoiceId: 'invoice-id', userId: 'user-id' })
    ).rejects.toBeInstanceOf(InvoicePaidError)

    // O curto-circuito por status === 'PAID' deve acontecer ANTES de calcular o status dinâmico
    expect(getInvoiceStatusSpy).not.toHaveBeenCalled()
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  // ---------------------------------------------------------------------
  // Fatura ainda não fechada (status calculado dinamicamente)
  // ---------------------------------------------------------------------

  it('Deve lançar InvoiceNotClosedError quando o status calculado não for CLOSED', async () => {
    vi.mocked(prisma.invoice.findUnique).mockResolvedValue(baseInvoice as any)
    vi.spyOn(PermissionService.prototype, 'isCardOwner').mockResolvedValue(true)
    const getInvoiceStatusSpy = vi
      .spyOn(InvoiceLifecycleService.prototype, 'getInvoiceStatus')
      .mockReturnValue('OPEN' as any)

    await expect(
      service.payInvoice({ invoiceId: 'invoice-id', userId: 'user-id' })
    ).rejects.toBeInstanceOf(InvoiceNotClosedError)

    // Garante que o status dinâmico foi calculado com os dados corretos da invoice + cartão
    expect(getInvoiceStatusSpy).toHaveBeenCalledWith({
      month: baseInvoice.month,
      year: baseInvoice.year,
      status: baseInvoice.status,
      paidAt: baseInvoice.paidAt,
      closingDay: baseInvoice.creditCard.closingDay,
    })

    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  // ---------------------------------------------------------------------
  // Sem parcelas pendentes para a competência
  // ---------------------------------------------------------------------

  it('Deve lançar NoPendingInstallmentsError quando não houver parcelas PENDING para a competência da fatura', async () => {
    vi.mocked(prisma.invoice.findUnique).mockResolvedValue(baseInvoice as any)
    vi.spyOn(PermissionService.prototype, 'isCardOwner').mockResolvedValue(true)
    vi.spyOn(InvoiceLifecycleService.prototype, 'getInvoiceStatus').mockReturnValue(
      'CLOSED' as any
    )
    vi.mocked(prisma.purchaseInstallment.findMany).mockResolvedValue([])

    await expect(
      service.payInvoice({ invoiceId: 'invoice-id', userId: 'user-id' })
    ).rejects.toBeInstanceOf(NoPendingInstallmentsError)

    // Chegou a abrir a transação, mas não deve ter marcado nada como pago
    expect(prisma.$transaction).toHaveBeenCalled()
    expect(prisma.purchaseInstallment.updateMany).not.toHaveBeenCalled()
    expect(prisma.invoice.update).not.toHaveBeenCalled()
  })

  // ---------------------------------------------------------------------
  // Caminho feliz
  // ---------------------------------------------------------------------

  it('Deve pagar a fatura: marcar parcelas pendentes como PAID, atualizar a invoice e retornar o total correto', async () => {
    vi.mocked(prisma.invoice.findUnique).mockResolvedValue(baseInvoice as any)
    vi.spyOn(PermissionService.prototype, 'isCardOwner').mockResolvedValue(true)
    vi.spyOn(InvoiceLifecycleService.prototype, 'getInvoiceStatus').mockReturnValue(
      'CLOSED' as any
    )
    vi.mocked(prisma.purchaseInstallment.findMany).mockResolvedValue([
      { id: 'installment-1', amount: 100 },
      { id: 'installment-2', amount: 50.5 },
    ] as any)
    vi.mocked(prisma.purchaseInstallment.updateMany).mockResolvedValue({ count: 2 } as any)
    const fakePaidAt = new Date('2026-07-20T10:00:00')
    vi.mocked(prisma.invoice.update).mockResolvedValue({
      id: 'invoice-id',
      status: 'PAID',
      month: 7,
      year: 2026,
      paidAt: fakePaidAt,
    } as any)

    const result = await service.payInvoice({
      invoiceId: 'invoice-id',
      userId: 'user-id',
    })

    // Buscou as parcelas certas: da competência da invoice, PENDING, do cartão certo
    expect(prisma.purchaseInstallment.findMany).toHaveBeenCalledWith({
      where: {
        competenceMonth: 7,
        competenceYear: 2026,
        status: 'PENDING',
        purchase: {
          creditCardId: 'card-id',
        },
      },
      select: {
        id: true,
        amount: true,
      },
    })

    // Marcou exatamente as parcelas retornadas como PAID
    expect(prisma.purchaseInstallment.updateMany).toHaveBeenCalledWith({
      where: {
        id: {
          in: ['installment-1', 'installment-2'],
        },
      },
      data: {
        status: 'PAID',
      },
    })

    // Atualizou a invoice para PAID com paidAt preenchido
    expect(prisma.invoice.update).toHaveBeenCalledWith({
      where: { id: 'invoice-id' },
      data: expect.objectContaining({
        status: 'PAID',
        paidAt: expect.any(Date),
      }),
    })

    // Total pago é a soma exata das parcelas (100 + 50.5), sem perda de precisão
    expect(result.totalPaid).toBeCloseTo(150.5, 2)
    expect(result.paidInstallments).toBe(2)
    expect(result.invoice.status).toBe('PAID')
    expect(result.invoice.paidAt).toEqual(fakePaidAt)
    expect(result.card).toEqual({ id: 'card-id', name: 'Nubank' })
  })

  it('Deve considerar apenas as parcelas da competência (mês/ano) exata da fatura, não de outras faturas do mesmo cartão', async () => {
    // Mesma invoice, mas agora com competência diferente para garantir que o filtro
    // de mês/ano é o que realmente isola as parcelas certas (evita pagar parcela de outra fatura)
    vi.mocked(prisma.invoice.findUnique).mockResolvedValue({
      ...baseInvoice,
      month: 12,
      year: 2026,
    } as any)
    vi.spyOn(PermissionService.prototype, 'isCardOwner').mockResolvedValue(true)
    vi.spyOn(InvoiceLifecycleService.prototype, 'getInvoiceStatus').mockReturnValue(
      'CLOSED' as any
    )
    vi.mocked(prisma.purchaseInstallment.findMany).mockResolvedValue([
      { id: 'installment-dec', amount: 200 },
    ] as any)
    vi.mocked(prisma.purchaseInstallment.updateMany).mockResolvedValue({ count: 1 } as any)
    vi.mocked(prisma.invoice.update).mockResolvedValue({
      id: 'invoice-id',
      status: 'PAID',
      month: 12,
      year: 2026,
      paidAt: new Date(),
    } as any)

    await service.payInvoice({ invoiceId: 'invoice-id', userId: 'user-id' })

    expect(prisma.purchaseInstallment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          competenceMonth: 12,
          competenceYear: 2026,
        }),
      })
    )
  })
})