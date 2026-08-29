import { describe, it, expect, beforeEach, vi } from 'vitest'
import { InvoiceEngineService } from './invoice-engine.service.js'
import { prisma } from '../../infra/database/prisma.js'

vi.mock('../../infra/database/prisma', () => ({
  prisma: {
    invoice: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}))

describe('InvoiceEngineService', () => {
  let service: InvoiceEngineService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new InvoiceEngineService()
  })

  // ---------------------------------------------------------------------
  // ensureInvoiceExists
  // ---------------------------------------------------------------------

  it('Deve retornar a invoice existente e NÃO criar uma nova quando ela já existir (idempotência)', async () => {
    const existingInvoice = {
      id: 'invoice-id',
      creditCardId: 'card-id',
      month: 7,
      year: 2026,
      status: 'OPEN',
    }
    vi.mocked(prisma.invoice.findUnique).mockResolvedValue(existingInvoice as any)

    const result = await service.ensureInvoiceExists('card-id', 7, 2026)

    expect(prisma.invoice.findUnique).toHaveBeenCalledWith({
      where: {
        creditCardId_month_year: {
          creditCardId: 'card-id',
          month: 7,
          year: 2026,
        },
      },
    })
    expect(prisma.invoice.create).not.toHaveBeenCalled()
    expect(result).toEqual(existingInvoice)
  })

  it('Deve criar uma nova invoice com status OPEN quando ela ainda não existir', async () => {
    vi.mocked(prisma.invoice.findUnique).mockResolvedValue(null)
    const createdInvoice = {
      id: 'new-invoice-id',
      creditCardId: 'card-id',
      month: 8,
      year: 2026,
      status: 'OPEN',
    }
    vi.mocked(prisma.invoice.create).mockResolvedValue(createdInvoice as any)

    const result = await service.ensureInvoiceExists('card-id', 8, 2026)

    expect(prisma.invoice.create).toHaveBeenCalledWith({
      data: {
        creditCardId: 'card-id',
        month: 8,
        year: 2026,
        status: 'OPEN',
      },
    })
    expect(result).toEqual(createdInvoice)
  })

  // ---------------------------------------------------------------------
  // syncInvoice (delegação)
  // ---------------------------------------------------------------------

  it('syncInvoice deve delegar para ensureInvoiceExists com os mesmos parâmetros', async () => {
    const ensureSpy = vi
      .spyOn(service, 'ensureInvoiceExists')
      .mockResolvedValue({ id: 'invoice-id' } as any)

    const result = await service.syncInvoice('card-id', 9, 2026)

    expect(ensureSpy).toHaveBeenCalledWith('card-id', 9, 2026)
    expect(result).toEqual({ id: 'invoice-id' })
  })

  it('syncInvoice não deve criar invoice duplicada quando já existir (comportamento real, sem mockar ensureInvoiceExists)', async () => {
    const existingInvoice = {
      id: 'invoice-id',
      creditCardId: 'card-id',
      month: 10,
      year: 2026,
      status: 'OPEN',
    }
    vi.mocked(prisma.invoice.findUnique).mockResolvedValue(existingInvoice as any)

    const result = await service.syncInvoice('card-id', 10, 2026)

    expect(prisma.invoice.create).not.toHaveBeenCalled()
    expect(result).toEqual(existingInvoice)
  })
})