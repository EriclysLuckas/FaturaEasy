import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PurchaseCreateService } from './purchase.create.service.js'
import { prisma } from '../../infra/database/prisma.js'
import { PermissionService } from '../permissions/permissions.service.js'
import { ForbiddenError } from '../../shared/errors/forbidden-error.js'
import { NotFoundError } from '../../shared/errors/not-found-error.js'
import { LimitExceededError } from '../../shared/errors/financial-erros.js'
import { InvoiceLifecycleService } from '../invoices/invoice-lifecycle.service.js'

vi.mock('../../infra/database/prisma', () => ({
  prisma: {
    creditCard: {
      findUnique: vi.fn(),
    },
    creditCardUser: {
      findUnique: vi.fn(),
    },
    purchase: {
      create: vi.fn(),
    },
    purchaseInstallment: {
      createMany: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
    invoice: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

vi.mock('../invoices/invoice-engine.service.js', () => ({
  InvoiceEngineService: class {
    ensureInvoiceExists = vi.fn()
  },
}))

describe('PurchaseCreateService', () => {
  let service: PurchaseCreateService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new PurchaseCreateService()
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
      return callback(prisma)
    })

    // Evita que o teste dependa da data REAL do sistema: por padrão, a invoice
    // do mês da compra ainda não existe e é considerada OPEN. Testes que
    // precisam simular uma fatura fechada devem sobrescrever este mock.
    vi.mocked(prisma.invoice.findUnique).mockResolvedValue(null)
    vi.spyOn(InvoiceLifecycleService.prototype, 'getInvoiceStatus').mockReturnValue(
      'OPEN' as any
    )
  })

  // ---------------------------------------------------------------------
  // Permissão / existência de vínculo
  // ---------------------------------------------------------------------

  it('Deve impedir compras de usuários que não pertencem ao cartão', async () => {
    vi.spyOn(PermissionService.prototype, 'isCardUser').mockResolvedValue(false)

    await expect(
      service.execute({
        userId: 'user-id',
        creditCardId: 'card-id',
        description: 'Notebook',
        amount: 5000,
        purchaseDate: new Date(),
        installments: 1,
      })
    ).rejects.toBeInstanceOf(ForbiddenError)

    expect(prisma.creditCard.findUnique).not.toHaveBeenCalled()
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('Deve lançar NotFoundError quando o vínculo do cartão não existir', async () => {
    vi.spyOn(PermissionService.prototype, 'isCardUser').mockResolvedValue(true)
    vi.mocked(prisma.creditCardUser.findUnique).mockResolvedValue(null)

    await expect(
      service.execute({
        userId: 'user-id',
        creditCardId: 'card-id',
        description: 'Notebook',
        amount: 5000,
        purchaseDate: new Date(),
        installments: 1,
      })
    ).rejects.toBeInstanceOf(NotFoundError)

    expect(prisma.creditCard.findUnique).not.toHaveBeenCalled()
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  // ---------------------------------------------------------------------
  // Limites (individual e global)
  // ---------------------------------------------------------------------

  it('Deve impedir compra quando o limite individual for excedido', async () => {
    vi.spyOn(PermissionService.prototype, 'isCardUser').mockResolvedValue(true)
    vi.mocked(prisma.creditCardUser.findUnique).mockResolvedValue({
      userId: 'user-id',
      creditCardId: 'card-id',
      limitGranted: 1000,
    } as any)
    vi.mocked(prisma.creditCard.findUnique).mockResolvedValue({
      id: 'card-id',
      totalLimit: 5000,
      closingDay: 10,
      dueDay: 20,
    } as any)
    vi.mocked(prisma.purchaseInstallment.findMany)
      .mockResolvedValueOnce([{ amount: 900 }] as any)
      .mockResolvedValueOnce([] as any)

    await expect(
      service.execute({
        userId: 'user-id',
        creditCardId: 'card-id',
        description: 'Notebook',
        amount: 300,
        purchaseDate: new Date(),
        installments: 1,
      })
    ).rejects.toBeInstanceOf(LimitExceededError)

    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('Deve impedir compra quando o limite global do cartão for excedido', async () => {
    vi.spyOn(PermissionService.prototype, 'isCardUser').mockResolvedValue(true)

    vi.mocked(prisma.creditCardUser.findUnique).mockResolvedValue({
      userId: 'user-id',
      creditCardId: 'card-id',
      limitGranted: 2000, // Limite individual com folga
    } as any)

    vi.mocked(prisma.creditCard.findUnique).mockResolvedValue({
      id: 'card-id',
      totalLimit: 5000, // Limite total do cartão
      closingDay: 10,
    } as any)

    vi.mocked(prisma.purchaseInstallment.findMany)
      .mockResolvedValueOnce([{ amount: 500 }] as any) // 1ª chamada: limite individual usado
      .mockResolvedValueOnce([{ amount: 4800 }] as any) // 2ª chamada: limite global usado (por todos)

    await expect(
      service.execute({
        userId: 'user-id',
        creditCardId: 'card-id',
        description: 'Supermercado',
        amount: 300, // 4800 + 300 = 5100 (estoura os 5000 globais)
        purchaseDate: new Date(),
        installments: 1,
      })
    ).rejects.toBeInstanceOf(LimitExceededError)

    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  // ---------------------------------------------------------------------
  // Rateio de parcelas / centavos
  // ---------------------------------------------------------------------

  it('Deve alocar a diferença de dízimas de centavos na última parcela', async () => {
    vi.spyOn(PermissionService.prototype, 'isCardUser').mockResolvedValue(true)

    vi.mocked(prisma.creditCardUser.findUnique).mockResolvedValue({
      limitGranted: 1000,
    } as any)

    vi.mocked(prisma.creditCard.findUnique).mockResolvedValue({
      totalLimit: 5000,
      closingDay: 10,
    } as any)

    vi.mocked(prisma.purchaseInstallment.findMany)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    vi.mocked(prisma.purchase.create).mockResolvedValue({ id: 'purchase-id' } as any)

    await service.execute({
      userId: 'user-id',
      creditCardId: 'card-id',
      description: 'Compra Não Divisível',
      amount: 100,
      purchaseDate: new Date('2026-06-05'), // antes do fechamento
      installments: 3,
    })

    expect(prisma.purchaseInstallment.create).toHaveBeenCalledTimes(3)

    // Parcela 1: 33.33
    expect(prisma.purchaseInstallment.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({ amount: 33.33, installmentNumber: 1 }),
      })
    )

    // Parcela 2: 33.33
    expect(prisma.purchaseInstallment.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({ amount: 33.33, installmentNumber: 2 }),
      })
    )

    // Parcela 3: absorve a diferença de +0.01 -> 33.34
    expect(prisma.purchaseInstallment.create).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        data: expect.objectContaining({ amount: 33.34, installmentNumber: 3 }),
      })
    )

    // Garantia adicional: soma das parcelas deve bater EXATAMENTE com o valor da compra
    const calls = vi.mocked(prisma.purchaseInstallment.create).mock.calls
    const total = calls.reduce((acc, call: any) => acc + call[0].data.amount, 0)
    expect(total).toBeCloseTo(100, 2)
  })

  // ---------------------------------------------------------------------
  // Rollover de mês/ano (competência da fatura)
  // ---------------------------------------------------------------------

  it('Deve processar rollover de mês e ano para compras após o fechamento em dezembro', async () => {
    vi.spyOn(PermissionService.prototype, 'isCardUser').mockResolvedValue(true)
    vi.mocked(prisma.creditCardUser.findUnique).mockResolvedValue({ limitGranted: 1000 } as any)
    vi.mocked(prisma.creditCard.findUnique).mockResolvedValue({
      totalLimit: 5000,
      closingDay: 10, // fatura fecha dia 10
    } as any)
    vi.mocked(prisma.purchaseInstallment.findMany).mockResolvedValue([])
    vi.mocked(prisma.purchase.create).mockResolvedValue({ id: 'purchase-id' } as any)

    await service.execute({
      userId: 'user-id',
      creditCardId: 'card-id',
      description: 'Presente de Natal',
      amount: 500,
      purchaseDate: new Date('2026-12-15'), // dia 15, após o fechamento de dezembro
      installments: 2,
    })

    // 1ª parcela deve pular para janeiro (1) do ano seguinte (2027)
    expect(prisma.purchaseInstallment.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          competenceMonth: 1,
          competenceYear: 2027,
        }),
      })
    )

    // 2ª parcela deve ir para fevereiro (2) de 2027
    expect(prisma.purchaseInstallment.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          competenceMonth: 2,
          competenceYear: 2027,
        }),
      })
    )
  })

  // ---------------------------------------------------------------------
  // Cálculo de limite disponível (consulta deve filtrar por PENDING)
  // ---------------------------------------------------------------------

  it('Deve consultar apenas parcelas PENDING ao calcular o limite individual e o limite global, excluindo PAID via filtro na query', async () => {
    vi.spyOn(PermissionService.prototype, 'isCardUser').mockResolvedValue(true)
    vi.mocked(prisma.creditCardUser.findUnique).mockResolvedValue({
      userId: 'user-id',
      creditCardId: 'card-id',
      limitGranted: 1000,
    } as any)
    vi.mocked(prisma.creditCard.findUnique).mockResolvedValue({
      id: 'card-id',
      totalLimit: 5000,
      closingDay: 10,
    } as any)
    vi.mocked(prisma.purchaseInstallment.findMany)
      .mockResolvedValueOnce([{ amount: 200 }] as any) // pendentes do usuário (limite individual)
      .mockResolvedValueOnce([{ amount: 300 }] as any) // pendentes do cartão inteiro (limite global)
    vi.mocked(prisma.purchase.create).mockResolvedValue({ id: 'purchase-id' } as any)

    await service.execute({
      userId: 'user-id',
      creditCardId: 'card-id',
      description: 'Compra dentro do limite',
      amount: 100,
      purchaseDate: new Date('2026-06-05'),
      installments: 1,
    })

    // 1ª consulta: limite INDIVIDUAL -> filtra por userId + status PENDING
    expect(prisma.purchaseInstallment.findMany).toHaveBeenNthCalledWith(1, {
      where: {
        userId: 'user-id',
        status: 'PENDING',
        purchase: {
          creditCardId: 'card-id',
        },
      },
    })

    // 2ª consulta: limite GLOBAL -> filtra só por creditCardId + status PENDING (sem userId)
    expect(prisma.purchaseInstallment.findMany).toHaveBeenNthCalledWith(2, {
      where: {
        status: 'PENDING',
        purchase: {
          creditCardId: 'card-id',
        },
      },
    })

    // Nenhuma das duas consultas deve filtrar por status 'PAID' nem trazer parcelas pagas
    const calls = vi.mocked(prisma.purchaseInstallment.findMany).mock.calls
    for (const call of calls) {
      expect((call[0] as any).where.status).toBe('PENDING')
    }
  })

  it('Deve permitir a compra quando parcelas pendentes existentes + novo valor não ultrapassam limite individual nem global', async () => {
    vi.spyOn(PermissionService.prototype, 'isCardUser').mockResolvedValue(true)
    vi.mocked(prisma.creditCardUser.findUnique).mockResolvedValue({
      userId: 'user-id',
      creditCardId: 'card-id',
      limitGranted: 1000, // usado: 200 + 300 (novo) = 500 <= 1000 OK
    } as any)
    vi.mocked(prisma.creditCard.findUnique).mockResolvedValue({
      id: 'card-id',
      totalLimit: 5000, // usado: 900 + 300 (novo) = 1200 <= 5000 OK
      closingDay: 10,
    } as any)
    vi.mocked(prisma.purchaseInstallment.findMany)
      .mockResolvedValueOnce([{ amount: 200 }] as any) // individual
      .mockResolvedValueOnce([{ amount: 900 }] as any) // global (soma de todos os usuários)
    vi.mocked(prisma.purchase.create).mockResolvedValue({ id: 'purchase-id' } as any)

    await expect(
      service.execute({
        userId: 'user-id',
        creditCardId: 'card-id',
        description: 'Compra dentro dos dois limites',
        amount: 300,
        purchaseDate: new Date('2026-06-05'),
        installments: 1,
      })
    ).resolves.not.toThrow()

    expect(prisma.$transaction).toHaveBeenCalled()
  })

  it('Deve manter a competência no mês corrente quando a compra ocorre antes do fechamento', async () => {
    // Caso-espelho do rollover: garante que a virada só acontece quando deveria
    vi.spyOn(PermissionService.prototype, 'isCardUser').mockResolvedValue(true)
    vi.mocked(prisma.creditCardUser.findUnique).mockResolvedValue({ limitGranted: 1000 } as any)
    vi.mocked(prisma.creditCard.findUnique).mockResolvedValue({
      totalLimit: 5000,
      closingDay: 10,
    } as any)
    vi.mocked(prisma.purchaseInstallment.findMany).mockResolvedValue([])
    vi.mocked(prisma.purchase.create).mockResolvedValue({ id: 'purchase-id' } as any)

    await service.execute({
      userId: 'user-id',
      creditCardId: 'card-id',
      description: 'Compra antes do fechamento',
      amount: 100,
      purchaseDate: new Date('2026-12-05'), // dia 5, antes do fechamento (dia 10)
      installments: 1,
    })

    expect(prisma.purchaseInstallment.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          competenceMonth: 12,
          competenceYear: 2026,
        }),
      })
    )
  })
})