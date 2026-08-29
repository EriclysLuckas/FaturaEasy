import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { InvoiceCloseService } from './invoice-close.service.js'
import { prisma } from '../../infra/database/prisma.js'
import { NotFoundError } from '../../shared/errors/not-found-error.js'
import { ConflictError } from '../../shared/errors/conflict-error.js'

vi.mock('../../infra/database/prisma', () => ({
  prisma: {
    invoice: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    purchaseInstallment: {
      findMany: vi.fn(),
    },
  },
}))

describe('InvoiceCloseService', () => {
  let service: InvoiceCloseService

  const baseInvoice = {
    id: 'invoice-id',
    creditCardId: 'card-id',
    month: 7,
    year: 2026,
    status: 'OPEN',
    openedAt: new Date('2026-07-01'),
    closedAt: null,
    creditCard: {
      id: 'card-id',
      closingDay: 10,
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    service = new InvoiceCloseService()
  })

  // =======================================================================
  // closeInvoice
  // =======================================================================

  describe('closeInvoice', () => {
    it('Deve lançar NotFoundError quando a invoice não existir', async () => {
      vi.mocked(prisma.invoice.findUnique).mockResolvedValue(null)

      await expect(
        service.closeInvoice('card-id', 7, 2026)
      ).rejects.toBeInstanceOf(NotFoundError)

      expect(prisma.purchaseInstallment.findMany).not.toHaveBeenCalled()
      expect(prisma.invoice.update).not.toHaveBeenCalled()
    })

    it('Deve lançar ConflictError quando a invoice já estiver CLOSED', async () => {
      vi.mocked(prisma.invoice.findUnique).mockResolvedValue({
        ...baseInvoice,
        status: 'CLOSED',
      } as any)

      await expect(
        service.closeInvoice('card-id', 7, 2026)
      ).rejects.toBeInstanceOf(ConflictError)

      expect(prisma.invoice.update).not.toHaveBeenCalled()
    })

    it('Deve lançar ConflictError quando a invoice já estiver PAID', async () => {
      vi.mocked(prisma.invoice.findUnique).mockResolvedValue({
        ...baseInvoice,
        status: 'PAID',
      } as any)

      await expect(
        service.closeInvoice('card-id', 7, 2026)
      ).rejects.toBeInstanceOf(ConflictError)

      expect(prisma.invoice.update).not.toHaveBeenCalled()
    })

    it('Deve buscar as parcelas da competência excluindo as CANCELED e somar o total corretamente', async () => {
      vi.mocked(prisma.invoice.findUnique).mockResolvedValue(baseInvoice as any)
      vi.mocked(prisma.purchaseInstallment.findMany).mockResolvedValue([
        { amount: 100 },
        { amount: 50.5 },
      ] as any)
      vi.mocked(prisma.invoice.update).mockResolvedValue({
        ...baseInvoice,
        status: 'CLOSED',
        closedAt: new Date('2026-07-11'),
      } as any)

      const result = await service.closeInvoice('card-id', 7, 2026)

      expect(prisma.purchaseInstallment.findMany).toHaveBeenCalledWith({
        where: {
          competenceMonth: 7,
          competenceYear: 2026,
          status: {
            not: 'CANCELED',
          },
          purchase: {
            creditCardId: 'card-id',
          },
        },
        select: {
          amount: true,
        },
      })

      expect(result.totalAmount).toBeCloseTo(150.5, 2)
    })

    it('Deve atualizar a invoice para CLOSED com closedAt igual ao momento atual', async () => {
      vi.useFakeTimers()
      const now = new Date('2026-07-11T09:00:00')
      vi.setSystemTime(now)

      vi.mocked(prisma.invoice.findUnique).mockResolvedValue(baseInvoice as any)
      vi.mocked(prisma.purchaseInstallment.findMany).mockResolvedValue([])
      vi.mocked(prisma.invoice.update).mockResolvedValue({
        ...baseInvoice,
        status: 'CLOSED',
        closedAt: now,
      } as any)

      await service.closeInvoice('card-id', 7, 2026)

      expect(prisma.invoice.update).toHaveBeenCalledWith({
        where: { id: 'invoice-id' },
        data: {
          status: 'CLOSED',
          closedAt: now,
        },
      })

      vi.useRealTimers()
    })

    it('Deve retornar o objeto no formato esperado (id, creditCardId, month, year, status, totalAmount, openedAt, closedAt)', async () => {
      vi.mocked(prisma.invoice.findUnique).mockResolvedValue(baseInvoice as any)
      vi.mocked(prisma.purchaseInstallment.findMany).mockResolvedValue([
        { amount: 200 },
      ] as any)
      const closedAt = new Date('2026-07-11')
      vi.mocked(prisma.invoice.update).mockResolvedValue({
        id: 'invoice-id',
        creditCardId: 'card-id',
        month: 7,
        year: 2026,
        status: 'CLOSED',
        openedAt: baseInvoice.openedAt,
        closedAt,
      } as any)

      const result = await service.closeInvoice('card-id', 7, 2026)

      expect(result).toEqual({
        id: 'invoice-id',
        creditCardId: 'card-id',
        month: 7,
        year: 2026,
        status: 'CLOSED',
        totalAmount: 200,
        openedAt: baseInvoice.openedAt,
        closedAt,
      })
    })
  })

  // =======================================================================
  // autoCloseInvoices
  // =======================================================================

  describe('autoCloseInvoices', () => {
    afterEach(() => {
      vi.useRealTimers()
    })

    it('Não deve fechar faturas cuja data de fechamento ainda não chegou', async () => {
      vi.useFakeTimers()
      // Fatura de 07/2026, fecha dia 10 às 23:59:59. "Agora" é dia 5 -> ainda não chegou.
      vi.setSystemTime(new Date('2026-07-05T12:00:00'))

      vi.mocked(prisma.invoice.findMany).mockResolvedValue([
        { ...baseInvoice, month: 7, year: 2026 },
      ] as any)
      const closeInvoiceSpy = vi.spyOn(service, 'closeInvoice')

      const result = await service.autoCloseInvoices()

      expect(closeInvoiceSpy).not.toHaveBeenCalled()
      expect(result).toEqual({
        success: true,
        totalClosed: 0,
        invoices: [],
      })
    })

    it('Deve fechar faturas cuja data de fechamento já passou', async () => {
      vi.useFakeTimers()
      // "Agora" é dia 15 -> já passou do fechamento (dia 10)
      vi.setSystemTime(new Date('2026-07-15T12:00:00'))

      vi.mocked(prisma.invoice.findMany).mockResolvedValue([
        { ...baseInvoice, month: 7, year: 2026 },
      ] as any)
      const closedResult = {
        id: 'invoice-id',
        creditCardId: 'card-id',
        month: 7,
        year: 2026,
        status: 'CLOSED',
        totalAmount: 100,
        openedAt: baseInvoice.openedAt,
        closedAt: new Date(),
      }
      const closeInvoiceSpy = vi
        .spyOn(service, 'closeInvoice')
        .mockResolvedValue(closedResult as any)

      const result = await service.autoCloseInvoices()

      expect(closeInvoiceSpy).toHaveBeenCalledWith('card-id', 7, 2026)
      expect(result.totalClosed).toBe(1)
      expect(result.invoices).toEqual([closedResult])
    })

    it('NÃO deve fechar a fatura exatamente no instante do fechamento (now === closingDate, limite ainda é OPEN)', async () => {
      vi.useFakeTimers()
      // Mesmo instante construído pela mesma regra do service: ano, mês-1, closingDay, 23:59:59
      const exactClosingMoment = new Date(2026, 6, 10, 23, 59, 59)
      vi.setSystemTime(exactClosingMoment)

      vi.mocked(prisma.invoice.findMany).mockResolvedValue([
        { ...baseInvoice, month: 7, year: 2026 },
      ] as any)
      const closeInvoiceSpy = vi.spyOn(service, 'closeInvoice')

      const result = await service.autoCloseInvoices()

      expect(closeInvoiceSpy).not.toHaveBeenCalled()
      expect(result.totalClosed).toBe(0)
    })

    it('Deve fechar a fatura um segundo depois do instante exato de fechamento', async () => {
      vi.useFakeTimers()
      const oneSecondAfterClosing = new Date(2026, 6, 11, 0, 0, 0)
      vi.setSystemTime(oneSecondAfterClosing)

      vi.mocked(prisma.invoice.findMany).mockResolvedValue([
        { ...baseInvoice, month: 7, year: 2026 },
      ] as any)
      const closeInvoiceSpy = vi
        .spyOn(service, 'closeInvoice')
        .mockResolvedValue({ id: 'invoice-id' } as any)

      const result = await service.autoCloseInvoices()

      expect(closeInvoiceSpy).toHaveBeenCalledWith('card-id', 7, 2026)
      expect(result.totalClosed).toBe(1)
    })

    it('Deve continuar processando as demais faturas quando uma delas falhar ao fechar', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-07-15T12:00:00'))
      // Evita poluir o output do teste com o console.error esperado
      vi.spyOn(console, 'error').mockImplementation(() => {})

      const invoiceThatFails = {
        ...baseInvoice,
        id: 'invoice-fail',
        creditCardId: 'card-fail',
        month: 7,
        year: 2026,
      }
      const invoiceThatSucceeds = {
        ...baseInvoice,
        id: 'invoice-ok',
        creditCardId: 'card-ok',
        month: 7,
        year: 2026,
      }

      vi.mocked(prisma.invoice.findMany).mockResolvedValue([
        invoiceThatFails,
        invoiceThatSucceeds,
      ] as any)

      const successResult = {
        id: 'invoice-ok',
        creditCardId: 'card-ok',
        month: 7,
        year: 2026,
        status: 'CLOSED',
        totalAmount: 100,
        openedAt: baseInvoice.openedAt,
        closedAt: new Date(),
      }

      vi.spyOn(service, 'closeInvoice').mockImplementation(async (creditCardId) => {
        if (creditCardId === 'card-fail') {
          throw new Error('Falha simulada ao fechar a fatura')
        }
        return successResult as any
      })

      const result = await service.autoCloseInvoices()

      // Não deve propagar o erro: autoCloseInvoices resolve normalmente
      expect(result.success).toBe(true)
      // Só a fatura que teve sucesso deve constar no resultado
      expect(result.totalClosed).toBe(1)
      expect(result.invoices).toEqual([successResult])
    })

    it('Deve buscar apenas faturas com status OPEN para avaliar o fechamento', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-07-15T12:00:00'))
      vi.mocked(prisma.invoice.findMany).mockResolvedValue([])

      await service.autoCloseInvoices()

      expect(prisma.invoice.findMany).toHaveBeenCalledWith({
        where: { status: 'OPEN' },
        include: { creditCard: true },
      })
    })
  })
})