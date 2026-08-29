import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PurchaseCancelService } from './pruchase.cancel.service.js'
import { prisma } from '../../infra/database/prisma.js'
import { PermissionService } from '../permissions/permissions.service.js'
import { InvoiceEngineService } from '../invoices/invoice-engine.service.js'
import { InvoiceLifecycleService } from '../invoices/invoice-lifecycle.service.js'
import { ForbiddenError } from '../../shared/errors/forbidden-error.js'
import { NotFoundError } from '../../shared/errors/not-found-error.js'
import { BadRequestError } from '../../shared/errors/bad-request-error.js'

vi.mock('../../infra/database/prisma', () => ({
  prisma: {
    purchase: {
      findUnique: vi.fn(),
    },
    invoice: {
      findUnique: vi.fn(),
    },
    purchaseInstallment: {
      updateMany: vi.fn(),
    },
  },
}))

describe('PurchaseCancelService', () => {
  let service: PurchaseCancelService

  const basePurchase = {
    id: 'purchase-id',
    creditCardId: 'card-id',
    creditCard: {
      closingDay: 10,
    },
    installmentsData: [
      { competenceMonth: 7, competenceYear: 2026 },
      { competenceMonth: 8, competenceYear: 2026 },
    ],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    service = new PurchaseCancelService()
  })

  // ---------------------------------------------------------------------
  // Existência da compra
  // ---------------------------------------------------------------------

  it('Deve lançar NotFoundError quando a compra não existir', async () => {
    vi.mocked(prisma.purchase.findUnique).mockResolvedValue(null)

    await expect(
      service.execute({ id: 'purchase-id', userId: 'user-id' })
    ).rejects.toBeInstanceOf(NotFoundError)

    expect(prisma.purchaseInstallment.updateMany).not.toHaveBeenCalled()
  })

  // ---------------------------------------------------------------------
  // Permissão: só o dono do cartão pode cancelar
  // ---------------------------------------------------------------------

  it('Deve lançar ForbiddenError quando o usuário não for o dono do cartão', async () => {
    vi.mocked(prisma.purchase.findUnique).mockResolvedValue(basePurchase as any)
    vi.spyOn(PermissionService.prototype, 'isCardOwner').mockResolvedValue(false)

    await expect(
      service.execute({ id: 'purchase-id', userId: 'user-id' })
    ).rejects.toBeInstanceOf(ForbiddenError)

    expect(prisma.invoice.findUnique).not.toHaveBeenCalled()
    expect(prisma.purchaseInstallment.updateMany).not.toHaveBeenCalled()
  })

  // ---------------------------------------------------------------------
  // Validação de fatura: bloqueia cancelamento se alguma invoice já fechou/pagou
  // ---------------------------------------------------------------------

  it('Deve lançar BadRequestError quando a invoice de alguma parcela estiver CLOSED', async () => {
    vi.mocked(prisma.purchase.findUnique).mockResolvedValue(basePurchase as any)
    vi.spyOn(PermissionService.prototype, 'isCardOwner').mockResolvedValue(true)
    vi.mocked(prisma.invoice.findUnique).mockResolvedValue({
      month: 7,
      year: 2026,
      status: 'OPEN',
      paidAt: null,
    } as any)
    vi.spyOn(InvoiceLifecycleService.prototype, 'getInvoiceStatus').mockReturnValue(
      'CLOSED' as any
    )

    await expect(
      service.execute({ id: 'purchase-id', userId: 'user-id' })
    ).rejects.toBeInstanceOf(BadRequestError)

    // Deve parar no primeiro item que falhar: só verificou a 1ª parcela, não a 2ª
    expect(prisma.invoice.findUnique).toHaveBeenCalledTimes(1)
    expect(prisma.purchaseInstallment.updateMany).not.toHaveBeenCalled()
  })

  it('Deve lançar BadRequestError quando a invoice de alguma parcela já estiver PAID', async () => {
    vi.mocked(prisma.purchase.findUnique).mockResolvedValue(basePurchase as any)
    vi.spyOn(PermissionService.prototype, 'isCardOwner').mockResolvedValue(true)
    vi.mocked(prisma.invoice.findUnique).mockResolvedValue({
      month: 7,
      year: 2026,
      status: 'PAID',
      paidAt: new Date(),
    } as any)
    vi.spyOn(InvoiceLifecycleService.prototype, 'getInvoiceStatus').mockReturnValue(
      'PAID' as any
    )

    await expect(
      service.execute({ id: 'purchase-id', userId: 'user-id' })
    ).rejects.toBeInstanceOf(BadRequestError)

    expect(prisma.purchaseInstallment.updateMany).not.toHaveBeenCalled()
  })

  it('Deve verificar a invoice de cada parcela com a chave composta correta (creditCardId + mês + ano)', async () => {
    vi.mocked(prisma.purchase.findUnique).mockResolvedValue(basePurchase as any)
    vi.spyOn(PermissionService.prototype, 'isCardOwner').mockResolvedValue(true)
    vi.mocked(prisma.invoice.findUnique).mockResolvedValue(null) // sem invoice ainda -> continue
    vi.spyOn(InvoiceLifecycleService.prototype, 'getInvoiceStatus')
    vi.mocked(prisma.purchaseInstallment.updateMany).mockResolvedValue({ count: 2 } as any)
    vi.spyOn(InvoiceEngineService.prototype, 'syncInvoice').mockResolvedValue(undefined as any)

    await service.execute({ id: 'purchase-id', userId: 'user-id' })

    expect(prisma.invoice.findUnique).toHaveBeenNthCalledWith(1, {
      where: {
        creditCardId_month_year: {
          creditCardId: 'card-id',
          month: 7,
          year: 2026,
        },
      },
    })

    expect(prisma.invoice.findUnique).toHaveBeenNthCalledWith(2, {
      where: {
        creditCardId_month_year: {
          creditCardId: 'card-id',
          month: 8,
          year: 2026,
        },
      },
    })
  })

  // ---------------------------------------------------------------------
  // Invoice ainda não gerada -> não bloqueia o cancelamento
  // ---------------------------------------------------------------------

  it('Deve permitir o cancelamento quando a invoice de uma parcela ainda não existir (continue)', async () => {
    vi.mocked(prisma.purchase.findUnique).mockResolvedValue(basePurchase as any)
    vi.spyOn(PermissionService.prototype, 'isCardOwner').mockResolvedValue(true)
    // 1ª parcela: invoice ainda não existe -> continue
    // 2ª parcela: invoice existe e está OPEN -> também não bloqueia
    vi.mocked(prisma.invoice.findUnique)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ month: 8, year: 2026, status: 'OPEN', paidAt: null } as any)
    vi.spyOn(InvoiceLifecycleService.prototype, 'getInvoiceStatus').mockReturnValue(
      'OPEN' as any
    )
    vi.mocked(prisma.purchaseInstallment.updateMany).mockResolvedValue({ count: 2 } as any)
    const syncInvoiceSpy = vi
      .spyOn(InvoiceEngineService.prototype, 'syncInvoice')
      .mockResolvedValue(undefined as any)

    const result = await service.execute({ id: 'purchase-id', userId: 'user-id' })

    expect(result).toEqual({
      success: true,
      message: 'Purchase canceled successfully',
    })
    expect(prisma.purchaseInstallment.updateMany).toHaveBeenCalledWith({
      where: { purchaseId: 'purchase-id' },
      data: { status: 'CANCELED' },
    })
    expect(syncInvoiceSpy).toHaveBeenCalledTimes(2)
  })

  // ---------------------------------------------------------------------
  // Cancelamento de parcelas
  // ---------------------------------------------------------------------

  it('Deve cancelar TODAS as parcelas da compra de uma vez (status CANCELED), não uma por uma', async () => {
    vi.mocked(prisma.purchase.findUnique).mockResolvedValue(basePurchase as any)
    vi.spyOn(PermissionService.prototype, 'isCardOwner').mockResolvedValue(true)
    vi.mocked(prisma.invoice.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.purchaseInstallment.updateMany).mockResolvedValue({ count: 2 } as any)
    vi.spyOn(InvoiceEngineService.prototype, 'syncInvoice').mockResolvedValue(undefined as any)

    await service.execute({ id: 'purchase-id', userId: 'user-id' })

    expect(prisma.purchaseInstallment.updateMany).toHaveBeenCalledTimes(1)
    expect(prisma.purchaseInstallment.updateMany).toHaveBeenCalledWith({
      where: { purchaseId: 'purchase-id' },
      data: { status: 'CANCELED' },
    })
  })

  // ---------------------------------------------------------------------
  // Recálculo de faturas: deduplicado por competência
  // ---------------------------------------------------------------------

  it('Deve recalcular (syncInvoice) apenas uma vez por competência, mesmo com várias parcelas no mesmo mês/ano', async () => {
    vi.mocked(prisma.purchase.findUnique).mockResolvedValue({
      ...basePurchase,
      installmentsData: [
        { competenceMonth: 7, competenceYear: 2026 },
        { competenceMonth: 7, competenceYear: 2026 }, // mesma competência da 1ª
        { competenceMonth: 8, competenceYear: 2026 },
      ],
    } as any)
    vi.spyOn(PermissionService.prototype, 'isCardOwner').mockResolvedValue(true)
    vi.mocked(prisma.invoice.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.purchaseInstallment.updateMany).mockResolvedValue({ count: 3 } as any)
    const syncInvoiceSpy = vi
      .spyOn(InvoiceEngineService.prototype, 'syncInvoice')
      .mockResolvedValue(undefined as any)

    await service.execute({ id: 'purchase-id', userId: 'user-id' })

    // 3 parcelas, mas só 2 competências distintas (7/2026 e 8/2026)
    expect(syncInvoiceSpy).toHaveBeenCalledTimes(2)
    expect(syncInvoiceSpy).toHaveBeenNthCalledWith(1, 'card-id', 7, 2026)
    expect(syncInvoiceSpy).toHaveBeenNthCalledWith(2, 'card-id', 8, 2026)
  })

  it('Deve recalcular cada competência distinta separadamente quando as parcelas pertencerem a meses diferentes', async () => {
    vi.mocked(prisma.purchase.findUnique).mockResolvedValue(basePurchase as any)
    vi.spyOn(PermissionService.prototype, 'isCardOwner').mockResolvedValue(true)
    vi.mocked(prisma.invoice.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.purchaseInstallment.updateMany).mockResolvedValue({ count: 2 } as any)
    const syncInvoiceSpy = vi
      .spyOn(InvoiceEngineService.prototype, 'syncInvoice')
      .mockResolvedValue(undefined as any)

    await service.execute({ id: 'purchase-id', userId: 'user-id' })

    expect(syncInvoiceSpy).toHaveBeenCalledTimes(2)
    expect(syncInvoiceSpy).toHaveBeenCalledWith('card-id', 7, 2026)
    expect(syncInvoiceSpy).toHaveBeenCalledWith('card-id', 8, 2026)
  })
})