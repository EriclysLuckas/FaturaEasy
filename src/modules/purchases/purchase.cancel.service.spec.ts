import {
    describe,
    it,
    expect,
    beforeEach,
    vi,
} from 'vitest'

import { PurchaseCancelService }
    from './purchase.cancel.service.js'

import { PermissionService }
    from '../permissions/permissions.service.js'

import { InvoiceEngineService }
    from '../invoices/invoice-engine.service.js'

import { InvoiceLifecycleService }
    from '../invoices/invoice-lifecycle.service.js'

import { ForbiddenError }
    from '../../shared/errors/forbidden-error.js'

import { NotFoundError }
    from '../../shared/errors/not-found-error.js'

import { BadRequestError }
    from '../../shared/errors/bad-request-error.js'

const mockTx = vi.hoisted(() => ({
    purchase: {
        findUnique: vi.fn(),
    },

    invoice: {
        findUnique: vi.fn(),
    },

    purchaseInstallment: {
        updateMany: vi.fn(),
    },
}))

const mockPurchaseLock = vi.hoisted(() => vi.fn())

vi.mock(
    '../../infra/database/prisma.js',
    () => ({
        prisma: {
            $transaction: vi.fn(
                async (callback) =>
                    callback(mockTx)
            ),
        },
    })
)

vi.mock(
    '../../infra/database/locks/purchase.lock.js',
    () => ({
        PurchaseLock: class {
            execute = mockPurchaseLock
        },
    })
)

describe('PurchaseCancelService', () => {
    let service: PurchaseCancelService

    const basePurchase = {
        id: 'purchase-id',

        creditCardId: 'card-id',

        creditCard: {
            closingDay: 10,
        },

        installmentsData: [
            {
                competenceMonth: 7,
                competenceYear: 2026,
            },

            {
                competenceMonth: 8,
                competenceYear: 2026,
            },
        ],
    }

    beforeEach(() => {
        vi.clearAllMocks()

        mockPurchaseLock
            .mockResolvedValue(undefined)

        service =
            new PurchaseCancelService()
    })

    it(
        'Deve lançar NotFoundError quando a compra não existir',
        async () => {
            mockTx.purchase.findUnique
                .mockResolvedValue(null)

            await expect(
                service.execute({
                    id: 'purchase-id',
                    userId: 'user-id',
                })
            ).rejects
                .toBeInstanceOf(NotFoundError)

            expect(
                mockPurchaseLock
            ).toHaveBeenCalledWith(
                mockTx,
                'purchase-id'
            )

            expect(
                mockTx.purchaseInstallment.updateMany
            ).not.toHaveBeenCalled()
        }
    )

    it(
        'Deve lançar ForbiddenError quando o usuário não for o dono do cartão',
        async () => {
            mockTx.purchase.findUnique
                .mockResolvedValue(
                    basePurchase as any
                )

            vi.spyOn(
                PermissionService.prototype,
                'isCardOwner'
            ).mockResolvedValue(false)

            await expect(
                service.execute({
                    id: 'purchase-id',
                    userId: 'user-id',
                })
            ).rejects
                .toBeInstanceOf(ForbiddenError)

            expect(
                mockTx.invoice.findUnique
            ).not.toHaveBeenCalled()

            expect(
                mockTx.purchaseInstallment.updateMany
            ).not.toHaveBeenCalled()
        }
    )

    it(
        'Deve lançar BadRequestError quando a invoice de alguma parcela estiver CLOSED',
        async () => {
            mockTx.purchase.findUnique
                .mockResolvedValue(
                    basePurchase as any
                )

            vi.spyOn(
                PermissionService.prototype,
                'isCardOwner'
            ).mockResolvedValue(true)

            mockTx.invoice.findUnique
                .mockResolvedValue({
                    month: 7,
                    year: 2026,
                    status: 'OPEN',
                    paidAt: null,
                } as any)

            vi.spyOn(
                InvoiceLifecycleService.prototype,
                'getInvoiceStatus'
            ).mockReturnValue(
                'CLOSED' as any
            )

            await expect(
                service.execute({
                    id: 'purchase-id',
                    userId: 'user-id',
                })
            ).rejects
                .toBeInstanceOf(BadRequestError)

            expect(
                mockTx.invoice.findUnique
            ).toHaveBeenCalledTimes(1)

            expect(
                mockTx.purchaseInstallment.updateMany
            ).not.toHaveBeenCalled()
        }
    )

    it(
        'Deve lançar BadRequestError quando a invoice de alguma parcela já estiver PAID',
        async () => {
            mockTx.purchase.findUnique
                .mockResolvedValue(
                    basePurchase as any
                )

            vi.spyOn(
                PermissionService.prototype,
                'isCardOwner'
            ).mockResolvedValue(true)

            mockTx.invoice.findUnique
                .mockResolvedValue({
                    month: 7,
                    year: 2026,
                    status: 'PAID',
                    paidAt: new Date(),
                } as any)

            vi.spyOn(
                InvoiceLifecycleService.prototype,
                'getInvoiceStatus'
            ).mockReturnValue(
                'PAID' as any
            )

            await expect(
                service.execute({
                    id: 'purchase-id',
                    userId: 'user-id',
                })
            ).rejects
                .toBeInstanceOf(BadRequestError)

            expect(
                mockTx.purchaseInstallment.updateMany
            ).not.toHaveBeenCalled()
        }
    )

    it(
        'Deve verificar a invoice de cada parcela com a chave composta correta (creditCardId + mês + ano)',
        async () => {
            mockTx.purchase.findUnique
                .mockResolvedValue(
                    basePurchase as any
                )

            vi.spyOn(
                PermissionService.prototype,
                'isCardOwner'
            ).mockResolvedValue(true)

            mockTx.invoice.findUnique
                .mockResolvedValue(null)

            mockTx.purchaseInstallment.updateMany
                .mockResolvedValue({
                    count: 2,
                } as any)

            vi.spyOn(
                InvoiceEngineService.prototype,
                'syncInvoice'
            ).mockResolvedValue(
                undefined as any
            )

            await service.execute({
                id: 'purchase-id',
                userId: 'user-id',
            })

            expect(
                mockTx.invoice.findUnique
            ).toHaveBeenNthCalledWith(
                1,
                {
                    where: {
                        creditCardId_month_year: {
                            creditCardId: 'card-id',
                            month: 7,
                            year: 2026,
                        },
                    },
                }
            )

            expect(
                mockTx.invoice.findUnique
            ).toHaveBeenNthCalledWith(
                2,
                {
                    where: {
                        creditCardId_month_year: {
                            creditCardId: 'card-id',
                            month: 8,
                            year: 2026,
                        },
                    },
                }
            )
        }
    )

    it(
        'Deve permitir o cancelamento quando a invoice de uma parcela ainda não existir (continue)',
        async () => {
            mockTx.purchase.findUnique
                .mockResolvedValue(
                    basePurchase as any
                )

            vi.spyOn(
                PermissionService.prototype,
                'isCardOwner'
            ).mockResolvedValue(true)

            mockTx.invoice.findUnique
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce({
                    month: 8,
                    year: 2026,
                    status: 'OPEN',
                    paidAt: null,
                } as any)

            vi.spyOn(
                InvoiceLifecycleService.prototype,
                'getInvoiceStatus'
            ).mockReturnValue(
                'OPEN' as any
            )

            mockTx.purchaseInstallment.updateMany
                .mockResolvedValue({
                    count: 2,
                } as any)

            const syncInvoiceSpy =
                vi.spyOn(
                    InvoiceEngineService.prototype,
                    'syncInvoice'
                ).mockResolvedValue(
                    undefined as any
                )

            const result =
                await service.execute({
                    id: 'purchase-id',
                    userId: 'user-id',
                })

            expect(result).toEqual({
                success: true,
                message:
                    'Purchase canceled successfully',
            })

            expect(
                mockTx.purchaseInstallment.updateMany
            ).toHaveBeenCalledWith(
                {
                    where: {
                        purchaseId:
                            'purchase-id',
                    },

                    data: {
                        status: 'CANCELED',
                    },
                }
            )

            expect(
                syncInvoiceSpy
            ).toHaveBeenCalledTimes(2)
        }
    )

    it(
        'Deve cancelar TODAS as parcelas da compra de uma vez (status CANCELED), não uma por uma',
        async () => {
            mockTx.purchase.findUnique
                .mockResolvedValue(
                    basePurchase as any
                )

            vi.spyOn(
                PermissionService.prototype,
                'isCardOwner'
            ).mockResolvedValue(true)

            mockTx.invoice.findUnique
                .mockResolvedValue(null)

            mockTx.purchaseInstallment.updateMany
                .mockResolvedValue({
                    count: 2,
                } as any)

            vi.spyOn(
                InvoiceEngineService.prototype,
                'syncInvoice'
            ).mockResolvedValue(
                undefined as any
            )

            await service.execute({
                id: 'purchase-id',
                userId: 'user-id',
            })

            expect(
                mockTx.purchaseInstallment.updateMany
            ).toHaveBeenCalledTimes(1)

            expect(
                mockTx.purchaseInstallment.updateMany
            ).toHaveBeenCalledWith(
                {
                    where: {
                        purchaseId:
                            'purchase-id',
                    },

                    data: {
                        status: 'CANCELED',
                    },
                }
            )
        }
    )

    it(
        'Deve recalcular (syncInvoice) apenas uma vez por competência, mesmo com várias parcelas no mesmo mês/ano',
        async () => {
            mockTx.purchase.findUnique
                .mockResolvedValue({
                    ...basePurchase,

                    installmentsData: [
                        {
                            competenceMonth: 7,
                            competenceYear: 2026,
                        },

                        {
                            competenceMonth: 7,
                            competenceYear: 2026,
                        },

                        {
                            competenceMonth: 8,
                            competenceYear: 2026,
                        },
                    ],
                } as any)

            vi.spyOn(
                PermissionService.prototype,
                'isCardOwner'
            ).mockResolvedValue(true)

            mockTx.invoice.findUnique
                .mockResolvedValue(null)

            mockTx.purchaseInstallment.updateMany
                .mockResolvedValue({
                    count: 3,
                } as any)

            const syncInvoiceSpy =
                vi.spyOn(
                    InvoiceEngineService.prototype,
                    'syncInvoice'
                ).mockResolvedValue(
                    undefined as any
                )

            await service.execute({
                id: 'purchase-id',
                userId: 'user-id',
            })

            expect(
                syncInvoiceSpy
            ).toHaveBeenCalledTimes(2)

            expect(
                syncInvoiceSpy
            ).toHaveBeenNthCalledWith(
                1,
                'card-id',
                7,
                2026,
                expect.anything()
            )

            expect(
                syncInvoiceSpy
            ).toHaveBeenNthCalledWith(
                2,
                'card-id',
                8,
                2026,
                expect.anything()
            )
        }
    )

    it(
        'Deve recalcular cada competência distinta separadamente quando as parcelas pertencerem a meses diferentes',
        async () => {
            mockTx.purchase.findUnique
                .mockResolvedValue(
                    basePurchase as any
                )

            vi.spyOn(
                PermissionService.prototype,
                'isCardOwner'
            ).mockResolvedValue(true)

            mockTx.invoice.findUnique
                .mockResolvedValue(null)

            mockTx.purchaseInstallment.updateMany
                .mockResolvedValue({
                    count: 2,
                } as any)

            const syncInvoiceSpy =
                vi.spyOn(
                    InvoiceEngineService.prototype,
                    'syncInvoice'
                ).mockResolvedValue(
                    undefined as any
                )

            await service.execute({
                id: 'purchase-id',
                userId: 'user-id',
            })

            expect(
                syncInvoiceSpy
            ).toHaveBeenCalledTimes(2)

            expect(
                syncInvoiceSpy
            ).toHaveBeenCalledWith(
                'card-id',
                7,
                2026,
                expect.anything()
            )

            expect(
                syncInvoiceSpy
            ).toHaveBeenCalledWith(
                'card-id',
                8,
                2026,
                expect.anything()
            )
        }
    )
})