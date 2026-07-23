import { describe, it, expect, vi, beforeEach } from 'vitest'

import { PermissionService } from './permissions.service.js'
import { prisma } from '../../infra/database/prisma.js'

vi.mock('../../infra/database/prisma.js', () => ({
  prisma: {
    creditCard: {
      findUnique: vi.fn(),
    },

    creditCardUser: {
      findUnique: vi.fn(),
    },
  },
}))

describe('PermissionService', () => {
  const service = new PermissionService()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('isCardOwner', () => {
    it('Deve retornar true quando usuário é owner do cartão', async () => {
      vi.mocked(prisma.creditCard.findUnique).mockResolvedValue({
        id: 'card-1',
        ownerId: 'user-1',
      } as any)

      const result =
        await service.isCardOwner(
          'user-1',
          'card-1'
        )

      expect(result).toBe(true)
    })

    it('Deve retornar false quando usuário não é owner', async () => {
      vi.mocked(prisma.creditCard.findUnique).mockResolvedValue({
        id: 'card-1',
        ownerId: 'user-2',
      } as any)

      const result =
        await service.isCardOwner(
          'user-1',
          'card-1'
        )

      expect(result).toBe(false)
    })

    it('Deve retornar false quando cartão não existir', async () => {
      vi.mocked(prisma.creditCard.findUnique).mockResolvedValue(null)

      const result =
        await service.isCardOwner(
          'user-1',
          'card-1'
        )

      expect(result).toBe(false)
    })
  })

  describe('isCardUser', () => {
    it('Deve retornar true quando usuário pertence ao cartão', async () => {
      vi.mocked(prisma.creditCardUser.findUnique).mockResolvedValue({
        userId: 'user-1',
        creditCardId: 'card-1',
      } as any)

      const result =
        await service.isCardUser(
          'user-1',
          'card-1'
        )

      expect(result).toBe(true)
    })

    it('Deve retornar false quando usuário não pertence ao cartão', async () => {
      vi.mocked(prisma.creditCardUser.findUnique).mockResolvedValue(null)

      const result =
        await service.isCardUser(
          'user-1',
          'card-1'
        )

      expect(result).toBe(false)
    })
  })
})