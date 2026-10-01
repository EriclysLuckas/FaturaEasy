
import { prisma }
    from '../../infra/database/prisma.js'

import { ForbiddenError }
    from '../../shared/errors/forbidden-error.js'

import { NotFoundError }
    from '../../shared/errors/not-found-error.js'

import { BadRequestError }
    from '../../shared/errors/bad-request-error.js'

import { PermissionService }
    from '../permissions/permissions.service.js'

import { InvoiceEngineService }
    from '../invoices/invoice-engine.service.js'

import { InvoiceLifecycleService }
    from '../invoices/invoice-lifecycle.service.js'

import { PurchaseLock }
    from '../../infra/database/locks/purchase.lock.js'

import type { CancelPurchaseInput }
    from './purchase.types.js'


const permissionService =
    new PermissionService()

const invoiceEngine =
    new InvoiceEngineService()

const invoiceLifecycle =
    new InvoiceLifecycleService()

const purchaseLock =
    new PurchaseLock()


export class PurchaseCancelService {

    async execute(
        data: CancelPurchaseInput
    ) {

        return prisma.$transaction(
            async (tx) => {

                //
                // BLOQUEIA A COMPRA
                //

                await purchaseLock.execute(
                    tx,
                    data.id
                )


                //
                // BUSCA A COMPRA
                //

                const purchase =
                    await tx.purchase.findUnique({

                        where: {
                            id: data.id,
                        },

                        include: {
                            installmentsData: true,

                            creditCard: true,
                        },
                    })


                if (!purchase) {
                    throw new NotFoundError(
                        'Purchase not found'
                    )
                }


                //
                // VALIDA PROPRIETÁRIO
                //

                const isOwner =
                    await permissionService.isCardOwner(
                        data.userId,
                        purchase.creditCardId,
                        tx
                    )


                if (!isOwner) {
                    throw new ForbiddenError(
                        'Access denied'
                    )
                }


                //
                // VALIDA FATURAS
                //

                for (
                    const installment
                    of purchase.installmentsData
                ) {

                    const invoice =
                        await tx.invoice.findUnique({

                            where: {
                                creditCardId_month_year: {

                                    creditCardId:
                                        purchase.creditCardId,

                                    month:
                                        installment.competenceMonth,

                                    year:
                                        installment.competenceYear,
                                },
                            },
                        })


                    if (!invoice) {
                        continue
                    }


                    const invoiceStatus =
                        invoiceLifecycle.getInvoiceStatus({

                            month:
                                invoice.month,

                            year:
                                invoice.year,

                            status:
                                invoice.status,

                            paidAt:
                                invoice.paidAt,

                            closingDay:
                                purchase.creditCard
                                    .closingDay,
                        })


                    if (
                        invoiceStatus === 'CLOSED' ||
                        invoiceStatus === 'PAID'
                    ) {

                        throw new BadRequestError(
                            `Invoice ${installment.competenceMonth}/${installment.competenceYear} is closed`
                        )
                    }
                }


                //
                // CANCELA PARCELAS
                //

                await tx.purchaseInstallment.updateMany({

                    where: {
                        purchaseId:
                            data.id,
                    },

                    data: {
                        status: 'CANCELED',
                    },
                })


                //
                // RECALCULA FATURAS
                //

                const processedInvoices =
                    new Set<string>()


                for (
                    const installment
                    of purchase.installmentsData
                ) {

                    const invoiceKey =
                        `${installment.competenceMonth}-${installment.competenceYear}`


                    if (
                        processedInvoices.has(
                            invoiceKey
                        )
                    ) {
                        continue
                    }


                    processedInvoices.add(
                        invoiceKey
                    )


                    await invoiceEngine.syncInvoice(
                        purchase.creditCardId,

                        installment.competenceMonth,

                        installment.competenceYear,

                        tx
                    )
                }


                //
                // RETORNO
                //

                return {
                    success: true,

                    message:
                        'Purchase canceled successfully',
                }
            }
        )
    }
}

