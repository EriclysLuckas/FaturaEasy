import {
  describe,
  it,
  expect,
  beforeEach,
  vi,
} from 'vitest'

import {
  PurchaseCreateService,
} from './purchase.create.service.js'

import {
  prisma,
} from '../../infra/database/prisma.js'

import {
  PermissionService,
} from '../permissions/permissions.service.js'

import {
  ForbiddenError,
} from '../../shared/errors/forbidden-error.js'

import {
  NotFoundError,
} from '../../shared/errors/not-found-error.js'

import {
  LimitExceededError,
} from '../../shared/errors/financial-erros.js'

import {
  InvoiceLifecycleService,
} from '../invoices/invoice-lifecycle.service.js'


/**
 * ---------------------------------------------------------
 * MOCKS
 * ---------------------------------------------------------
 */

vi.mock(
  '../../infra/database/prisma',
  () => ({
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
  })
)


vi.mock(
  '../invoices/invoice-engine.service.js',
  () => ({
    InvoiceEngineService: class {
      ensureInvoiceExists =
        vi.fn()
    },
  })
)


/**
 * O lock é responsabilidade de uma camada específica.
 *
 * Nesta spec estamos testando o PurchaseCreateService,
 * portanto o SQL real do FOR UPDATE não precisa ser executado.
 *
 * A existência do lock será verificada pelo teste.
 *
 * O SQL real deve ser validado em teste próprio/integrado.
 */

const mockCreditCardLock = vi.hoisted(() => vi.fn())

vi.mock(
  '../../infra/database/locks/credit-card.lock.js',
  () => ({
    CreditCardLock: class {
      execute =
        mockCreditCardLock
    },
  })
)


describe(
  'PurchaseCreateService',
  () => {
    let service:
      PurchaseCreateService


    beforeEach(() => {
      vi.clearAllMocks()

      service =
        new PurchaseCreateService()


      /**
       * Simula uma transação Prisma.
       *
       * O callback recebe o prisma mockado como
       * transaction client.
       */
      vi.mocked(
        prisma.$transaction
      ).mockImplementation(
        async (
          callback: any
        ) => {
          return callback(prisma)
        }
      )


      /**
       * O lock deve ser executado normalmente,
       * mas o SQL real não é executado neste teste unitário.
       */
      mockCreditCardLock
        .mockResolvedValue(undefined)


      /**
       * Por padrão, a invoice ainda não existe.
       */
      vi.mocked(
        prisma.invoice.findUnique
      ).mockResolvedValue(null)


      /**
       * Evita dependência da data real do sistema.
       */
      vi.spyOn(
        InvoiceLifecycleService.prototype,
        'getInvoiceStatus'
      ).mockReturnValue(
        'OPEN' as any
      )
    })


    // -----------------------------------------------------
    // Permissão / existência de vínculo
    // -----------------------------------------------------

    it(
      'Deve impedir compras de usuários que não pertencem ao cartão',
      async () => {

        vi.spyOn(
          PermissionService.prototype,
          'isCardUser'
        ).mockResolvedValue(false)


        await expect(
          service.execute({
            userId:
              'user-id',

            creditCardId:
              'card-id',

            description:
              'Notebook',

            amount:
              5000,

            purchaseDate:
              new Date(),

            installments:
              1,
          })
        ).rejects.toBeInstanceOf(
          ForbiddenError
        )


        /**
         * A transação deve ter sido iniciada.
         */
        expect(
          prisma.$transaction
        ).toHaveBeenCalled()


        /**
         * O cartão deve ter sido bloqueado
         * antes da validação.
         */
        expect(
          mockCreditCardLock
        ).toHaveBeenCalledWith(
          prisma,
          'card-id'
        )


        expect(
          prisma.creditCard.findUnique
        ).not.toHaveBeenCalled()
      }
    )


    it(
      'Deve lançar NotFoundError quando o vínculo do cartão não existir',
      async () => {

        vi.spyOn(
          PermissionService.prototype,
          'isCardUser'
        ).mockResolvedValue(true)


        vi.mocked(
          prisma.creditCardUser.findUnique
        ).mockResolvedValue(null)


        await expect(
          service.execute({
            userId:
              'user-id',

            creditCardId:
              'card-id',

            description:
              'Notebook',

            amount:
              5000,

            purchaseDate:
              new Date(),

            installments:
              1,
          })
        ).rejects.toBeInstanceOf(
          NotFoundError
        )


        expect(
          prisma.$transaction
        ).toHaveBeenCalled()


        expect(
          mockCreditCardLock
        ).toHaveBeenCalledWith(
          prisma,
          'card-id'
        )


        expect(
          prisma.creditCard.findUnique
        ).not.toHaveBeenCalled()
      }
    )


    // -----------------------------------------------------
    // Limites
    // -----------------------------------------------------

    it(
      'Deve impedir compra quando o limite individual for excedido',
      async () => {

        vi.spyOn(
          PermissionService.prototype,
          'isCardUser'
        ).mockResolvedValue(true)


        vi.mocked(
          prisma.creditCardUser.findUnique
        ).mockResolvedValue({
          userId:
            'user-id',

          creditCardId:
            'card-id',

          limitGranted:
            1000,
        } as any)


        vi.mocked(
          prisma.creditCard.findUnique
        ).mockResolvedValue({
          id:
            'card-id',

          totalLimit:
            5000,

          closingDay:
            10,

          dueDay:
            20,
        } as any)


        vi.mocked(
          prisma.purchaseInstallment.findMany
        )
          .mockResolvedValueOnce(
            [
              {
                amount:
                  900,
              },
            ] as any
          )
          .mockResolvedValueOnce(
            [] as any
          )


        await expect(
          service.execute({
            userId:
              'user-id',

            creditCardId:
              'card-id',

            description:
              'Notebook',

            amount:
              300,

            purchaseDate:
              new Date(),

            installments:
              1,
          })
        ).rejects.toBeInstanceOf(
          LimitExceededError
        )


        /**
         * Agora a transação É esperada.
         */
        expect(
          prisma.$transaction
        ).toHaveBeenCalled()


        expect(
          mockCreditCardLock
        ).toHaveBeenCalledWith(
          prisma,
          'card-id'
        )
      }
    )


    it(
      'Deve impedir compra quando o limite global do cartão for excedido',
      async () => {

        vi.spyOn(
          PermissionService.prototype,
          'isCardUser'
        ).mockResolvedValue(true)


        vi.mocked(
          prisma.creditCardUser.findUnique
        ).mockResolvedValue({
          userId:
            'user-id',

          creditCardId:
            'card-id',

          limitGranted:
            2000,
        } as any)


        vi.mocked(
          prisma.creditCard.findUnique
        ).mockResolvedValue({
          id:
            'card-id',

          totalLimit:
            5000,

          closingDay:
            10,
        } as any)


        vi.mocked(
          prisma.purchaseInstallment.findMany
        )
          .mockResolvedValueOnce(
            [
              {
                amount:
                  500,
              },
            ] as any
          )
          .mockResolvedValueOnce(
            [
              {
                amount:
                  4800,
              },
            ] as any
          )


        await expect(
          service.execute({
            userId:
              'user-id',

            creditCardId:
              'card-id',

            description:
              'Supermercado',

            amount:
              300,

            purchaseDate:
              new Date(),

            installments:
              1,
          })
        ).rejects.toBeInstanceOf(
          LimitExceededError
        )


        expect(
          prisma.$transaction
        ).toHaveBeenCalled()


        expect(
          mockCreditCardLock
        ).toHaveBeenCalledWith(
          prisma,
          'card-id'
        )
      }
    )


    // -----------------------------------------------------
    // Rateio
    // -----------------------------------------------------

    it(
      'Deve alocar a diferença de dízimas de centavos na última parcela',
      async () => {

        vi.spyOn(
          PermissionService.prototype,
          'isCardUser'
        ).mockResolvedValue(true)


        vi.mocked(
          prisma.creditCardUser.findUnique
        ).mockResolvedValue({
          limitGranted:
            1000,
        } as any)


        vi.mocked(
          prisma.creditCard.findUnique
        ).mockResolvedValue({
          totalLimit:
            5000,

          closingDay:
            10,
        } as any)


        vi.mocked(
          prisma.purchaseInstallment.findMany
        )
          .mockResolvedValueOnce(
            []
          )
          .mockResolvedValueOnce(
            []
          )


        vi.mocked(
          prisma.purchase.create
        ).mockResolvedValue({
          id:
            'purchase-id',
        } as any)


        await service.execute({
          userId:
            'user-id',

          creditCardId:
            'card-id',

          description:
            'Compra Não Divisível',

          amount:
            100,

          purchaseDate:
            new Date(
              '2026-06-05'
            ),

          installments:
            3,
        })


        expect(
          prisma.purchaseInstallment.create
        ).toHaveBeenCalledTimes(3)


        expect(
          prisma.purchaseInstallment.create
        ).toHaveBeenNthCalledWith(
          1,

          expect.objectContaining({
            data:
              expect.objectContaining({
                amount:
                  33.33,

                installmentNumber:
                  1,
              }),
          })
        )


        expect(
          prisma.purchaseInstallment.create
        ).toHaveBeenNthCalledWith(
          2,

          expect.objectContaining({
            data:
              expect.objectContaining({
                amount:
                  33.33,

                installmentNumber:
                  2,
              }),
          })
        )


        expect(
          prisma.purchaseInstallment.create
        ).toHaveBeenNthCalledWith(
          3,

          expect.objectContaining({
            data:
              expect.objectContaining({
                amount:
                  33.34,

                installmentNumber:
                  3,
              }),
          })
        )


        const calls =
          vi.mocked(
            prisma.purchaseInstallment.create
          ).mock.calls


        const total =
          calls.reduce(
            (
              acc,
              call: any
            ) =>
              acc +
              call[0].data.amount,

            0
          )


        expect(
          total
        ).toBeCloseTo(
          100,
          2
        )
      }
    )


    // -----------------------------------------------------
    // Rollover
    // -----------------------------------------------------

    it(
      'Deve processar rollover de mês e ano para compras após o fechamento em dezembro',
      async () => {

        vi.spyOn(
          PermissionService.prototype,
          'isCardUser'
        ).mockResolvedValue(true)


        vi.mocked(
          prisma.creditCardUser.findUnique
        ).mockResolvedValue({
          limitGranted:
            1000,
        } as any)


        vi.mocked(
          prisma.creditCard.findUnique
        ).mockResolvedValue({
          totalLimit:
            5000,

          closingDay:
            10,
        } as any)


        vi.mocked(
          prisma.purchaseInstallment.findMany
        ).mockResolvedValue([])


        vi.mocked(
          prisma.purchase.create
        ).mockResolvedValue({
          id:
            'purchase-id',
        } as any)


        await service.execute({
          userId:
            'user-id',

          creditCardId:
            'card-id',

          description:
            'Presente de Natal',

          amount:
            500,

          purchaseDate:
            new Date(
              '2026-12-15'
            ),

          installments:
            2,
        })


        expect(
          prisma.purchaseInstallment.create
        ).toHaveBeenNthCalledWith(
          1,

          expect.objectContaining({
            data:
              expect.objectContaining({
                competenceMonth:
                  1,

                competenceYear:
                  2027,
              }),
          })
        )


        expect(
          prisma.purchaseInstallment.create
        ).toHaveBeenNthCalledWith(
          2,

          expect.objectContaining({
            data:
              expect.objectContaining({
                competenceMonth:
                  2,

                competenceYear:
                  2027,
              }),
          })
        )
      }
    )


    // -----------------------------------------------------
    // Limite - PENDING
    // -----------------------------------------------------

    it(
      'Deve consultar apenas parcelas PENDING ao calcular o limite individual e o limite global, excluindo PAID via filtro na query',
      async () => {

        vi.spyOn(
          PermissionService.prototype,
          'isCardUser'
        ).mockResolvedValue(true)


        vi.mocked(
          prisma.creditCardUser.findUnique
        ).mockResolvedValue({
          userId:
            'user-id',

          creditCardId:
            'card-id',

          limitGranted:
            1000,
        } as any)


        vi.mocked(
          prisma.creditCard.findUnique
        ).mockResolvedValue({
          id:
            'card-id',

          totalLimit:
            5000,

          closingDay:
            10,
        } as any)


        vi.mocked(
          prisma.purchaseInstallment.findMany
        )
          .mockResolvedValueOnce(
            [
              {
                amount:
                  200,
              },
            ] as any
          )
          .mockResolvedValueOnce(
            [
              {
                amount:
                  300,
              },
            ] as any
          )


        vi.mocked(
          prisma.purchase.create
        ).mockResolvedValue({
          id:
            'purchase-id',
        } as any)


        await service.execute({
          userId:
            'user-id',

          creditCardId:
            'card-id',

          description:
            'Compra dentro do limite',

          amount:
            100,

          purchaseDate:
            new Date(
              '2026-06-05'
            ),

          installments:
            1,
        })


        expect(
          prisma.purchaseInstallment.findMany
        ).toHaveBeenNthCalledWith(
          1,

          {
            where: {
              userId:
                'user-id',

              status:
                'PENDING',

              purchase: {
                creditCardId:
                  'card-id',
              },
            },
          }
        )


        expect(
          prisma.purchaseInstallment.findMany
        ).toHaveBeenNthCalledWith(
          2,

          {
            where: {
              status:
                'PENDING',

              purchase: {
                creditCardId:
                  'card-id',
              },
            },
          }
        )


        const calls =
          vi.mocked(
            prisma.purchaseInstallment.findMany
          ).mock.calls


        for (
          const call of calls
        ) {
          expect(
            (call[0] as any)
              .where.status
          ).toBe(
            'PENDING'
          )
        }
      }
    )


    it(
      'Deve permitir a compra quando parcelas pendentes existentes + novo valor não ultrapassam limite individual nem global',
      async () => {

        vi.spyOn(
          PermissionService.prototype,
          'isCardUser'
        ).mockResolvedValue(true)


        vi.mocked(
          prisma.creditCardUser.findUnique
        ).mockResolvedValue({
          userId:
            'user-id',

          creditCardId:
            'card-id',

          limitGranted:
            1000,
        } as any)


        vi.mocked(
          prisma.creditCard.findUnique
        ).mockResolvedValue({
          id:
            'card-id',

          totalLimit:
            5000,

          closingDay:
            10,
        } as any)


        vi.mocked(
          prisma.purchaseInstallment.findMany
        )
          .mockResolvedValueOnce(
            [
              {
                amount:
                  200,
              },
            ] as any
          )
          .mockResolvedValueOnce(
            [
              {
                amount:
                  900,
              },
            ] as any
          )


        vi.mocked(
          prisma.purchase.create
        ).mockResolvedValue({
          id:
            'purchase-id',
        } as any)


        await expect(
          service.execute({
            userId:
              'user-id',

            creditCardId:
              'card-id',

            description:
              'Compra dentro dos dois limites',

            amount:
              300,

            purchaseDate:
              new Date(
                '2026-06-05'
              ),

            installments:
              1,
          })
        ).resolves.not.toThrow()


        expect(
          prisma.$transaction
        ).toHaveBeenCalled()


        expect(
          mockCreditCardLock
        ).toHaveBeenCalledWith(
          prisma,
          'card-id'
        )
      }
    )


    it(
      'Deve manter a competência no mês corrente quando a compra ocorre antes do fechamento',
      async () => {

        vi.spyOn(
          PermissionService.prototype,
          'isCardUser'
        ).mockResolvedValue(true)


        vi.mocked(
          prisma.creditCardUser.findUnique
        ).mockResolvedValue({
          limitGranted:
            1000,
        } as any)


        vi.mocked(
          prisma.creditCard.findUnique
        ).mockResolvedValue({
          totalLimit:
            5000,

          closingDay:
            10,
        } as any)


        vi.mocked(
          prisma.purchaseInstallment.findMany
        ).mockResolvedValue([])


        vi.mocked(
          prisma.purchase.create
        ).mockResolvedValue({
          id:
            'purchase-id',
        } as any)


        await service.execute({
          userId:
            'user-id',

          creditCardId:
            'card-id',

          description:
            'Compra antes do fechamento',

          amount:
            100,

          purchaseDate:
            new Date(
              '2026-12-09'
            ),

          installments:
            1,
        })


        expect(
          prisma.purchaseInstallment.create
        ).toHaveBeenNthCalledWith(
          1,

          expect.objectContaining({
            data:
              expect.objectContaining({
                competenceMonth:
                  12,

                competenceYear:
                  2026,
              }),
          })
        )
      }
    )
  }
)

describe(
  'PurchaseCreateService',
  () => {
    let service: PurchaseCreateService

    beforeEach(() => {
      // ...
      service = new PurchaseCreateService()
    })

    // seus testes...

    it(
      'Deve enviar a compra do próprio dia de fechamento para a próxima competência',
      async () => {

        vi.spyOn(
          PermissionService.prototype,
          'isCardUser'
        ).mockResolvedValue(true)

        // ...

        await service.execute({
          userId: 'user-id',
          creditCardId: 'card-id',
          description:
            'Compra no dia do fechamento',
          amount: 100,
          purchaseDate:
            new Date('2026-12-10'),
          installments: 1,
        })

        // ...
      }
    )
  }
)