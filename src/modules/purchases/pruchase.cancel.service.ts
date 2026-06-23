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

import type { CancelPurchaseInput }
    from './purchase.types.js'

const permissionService =
    new PermissionService()

const invoiceEngine =
    new InvoiceEngineService()

const invoiceLifecycle =
    new InvoiceLifecycleService()

export class PurchaseCancelService {
    async execute(
        data: CancelPurchaseInput
    ) {
        const purchase =
            await prisma.purchase.findUnique({
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

        const isOwner =
            await permissionService.isCardOwner(
                data.userId,
                purchase.creditCardId
            )

        if (!isOwner) {
            throw new ForbiddenError(
                'Access denied'
            )
        }

        //
        // VALIDA FATURAS
        //

        for (const installment of purchase.installmentsData) {
            const invoice =
                await prisma.invoice.findUnique({
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
                invoiceLifecycle.getInvoiceStatus(
                    {
                        month: invoice.month,

                        year: invoice.year,

                        status:
                            invoice.status,

                        paidAt:
                            invoice.paidAt,

                        closingDay:
                            purchase.creditCard
                                .closingDay,
                    }
                )

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

        await prisma.purchaseInstallment.updateMany(
            {
                where: {
                    purchaseId: data.id,
                },

                data: {
                    status: 'CANCELED',
                },
            }
        )

        //
        // RECALCULA FATURAS
        //

        const processedInvoices =
            new Set<string>()

        for (const installment of purchase.installmentsData) {
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
                installment.competenceYear
            )
        }

        return {
            success: true,

            message:
                'Purchase canceled successfully',
        }
    }
}

