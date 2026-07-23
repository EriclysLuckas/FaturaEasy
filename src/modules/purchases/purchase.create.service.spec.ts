import { describe, it, expect, beforeEach, vi } from 'vitest'

import { PurchaseCreateService } from './purchase.create.service.js'

import { prisma } from '../../infra/database/prisma.js'

import { PermissionService } from '../permissions/permissions.service.js'

import { ForbiddenError } from '../../shared/errors/forbidden-error.js'
import { NotFoundError } from '../../shared/errors/not-found-error.js'

import {
  LimitExceededError,
} from '../../shared/errors/financial-erros.js'

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

    service =
      new PurchaseCreateService()

    vi.mocked(
      prisma.$transaction
    ).mockImplementation(
      async (callback: any) => {
        return callback(prisma)
      }
    )
  })

  it(
    'Deve impedir compras de usuários que não pertencem ao cartão',
    async () => {

      // Arrange

      vi.spyOn(
        PermissionService.prototype,
        'isCardUser'
      ).mockResolvedValue(false)

      // Act / Assert

      await expect(
        service.execute({
          userId: 'user-id',

          creditCardId: 'card-id',

          description: 'Notebook',

          amount: 5000,

          purchaseDate: new Date(),

          installments: 1,
        })
      ).rejects.toBeInstanceOf(
        ForbiddenError
      )

      expect(
        prisma.creditCard.findUnique
      ).not.toHaveBeenCalled()

      expect(
        prisma.$transaction
      ).not.toHaveBeenCalled()
    }
  )

  it(
    'Deve lançar NotFoundError quando o vínculo do cartão não existir',
    async () => {

      // Arrange

      vi.spyOn(
        PermissionService.prototype,
        'isCardUser'
      ).mockResolvedValue(true)

      vi.mocked(
        prisma.creditCardUser.findUnique
      ).mockResolvedValue(null)

      // Act / Assert

      await expect(
        service.execute({
          userId: 'user-id',

          creditCardId: 'card-id',

          description: 'Notebook',

          amount: 5000,

          purchaseDate: new Date(),

          installments: 1,
        })
      ).rejects.toBeInstanceOf(
        NotFoundError
      )

      expect(
        prisma.creditCard.findUnique
      ).not.toHaveBeenCalled()

      expect(
        prisma.$transaction
      ).not.toHaveBeenCalled()
    }
  )

  it(
    'Deve impedir compra quando o limite individual for excedido',
    async () => {

      // Arrange

      vi.spyOn(
        PermissionService.prototype,
        'isCardUser'
      ).mockResolvedValue(true)

      vi.mocked(
        prisma.creditCardUser.findUnique
      ).mockResolvedValue({
        userId: 'user-id',

        creditCardId: 'card-id',

        limitGranted: 1000,
      } as any)

      vi.mocked(
        prisma.creditCard.findUnique
      ).mockResolvedValue({
        id: 'card-id',

        totalLimit: 5000,

        closingDay: 10,

        dueDay: 20,
      } as any)

      vi.mocked(
        prisma.purchaseInstallment.findMany
      )
        .mockResolvedValueOnce([
          {
            amount: 900,
          },
        ] as any)
        .mockResolvedValueOnce([] as any)

      // Act / Assert

      await expect(
        service.execute({
          userId: 'user-id',

          creditCardId: 'card-id',

          description: 'Notebook',

          amount: 300,

          purchaseDate: new Date(),

          installments: 1,
        })
      ).rejects.toBeInstanceOf(
        LimitExceededError
      )

      expect(
        prisma.$transaction
      ).not.toHaveBeenCalled()
    }
  )
})