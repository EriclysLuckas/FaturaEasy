import { prisma }
    from '../../infra/database/prisma.js'

import { ForbiddenError }
    from '../../shared/errors/forbidden-error.js'

import { NotFoundError }
    from '../../shared/errors/not-found-error.js'

import { BadRequestError }
    from '../../shared/errors/bad-request-error.js'

import {
    LimitExceededError,
    InvoiceClosedError,
    InvoicePaidError,
    
}
    from '../../shared/errors/financial-erros.js'

import { PermissionService }
    from '../permissions/permissions.service.js'

import { InvoiceEngineService }
    from '../invoices/invoice-engine.service.js'

import { InvoiceLifecycleService }
    from '../invoices/invoice-lifecycle.service.js'

import type { CreatePurchaseInput }
    from './purchase.types.js'

const permissionService =
    new PermissionService()

const invoiceEngine =
    new InvoiceEngineService()

const invoiceLifecycle =
    new InvoiceLifecycleService()

export class PurchaseCreateService {
    async execute(
        data: CreatePurchaseInput
    ) {
        //
        // VALIDA USUÁRIO DO CARTÃO
        //

        const isCardUser =
            await permissionService.isCardUser(
                data.userId,
                data.creditCardId
            )

        if (!isCardUser) {
            throw new ForbiddenError(
                'User does not belong to this card'
            )
        }

        //
        // BUSCA VÍNCULO
        //

        const cardLink =
            await prisma.creditCardUser.findUnique(
                {
                    where: {
                        userId_creditCardId: {
                            userId: data.userId,

                            creditCardId:
                                data.creditCardId,
                        },
                    },
                }
            )

        if (!cardLink) {
            throw new NotFoundError(
                'Card link not found'
            )
        }

        //
        // BUSCA CARTÃO
        //

        const card =
            await prisma.creditCard.findUnique({
                where: {
                    id: data.creditCardId,
                },
            })

        if (!card) {
            throw new NotFoundError(
                'Card not found'
            )
        }

        //
        // LIMITE INDIVIDUAL
        //

        const userPendingInstallments =
            await prisma.purchaseInstallment.findMany(
                {
                    where: {
                        userId: data.userId,

                        status: 'PENDING',

                        purchase: {
                            creditCardId:
                                data.creditCardId,
                        },
                    },
                }
            )

        const userUsedLimit =
            userPendingInstallments.reduce(
                (acc, installment) =>
                    acc +
                    Number(installment.amount),
                0
            )

        const userAvailableLimit =
            Number(cardLink.limitGranted) -
            userUsedLimit

        if (
            data.amount >
            userAvailableLimit
        ) {
            throw new LimitExceededError(
                'User limit exceeded'
            )
        }

        //
        // LIMITE GLOBAL
        //

        const cardPendingInstallments =
            await prisma.purchaseInstallment.findMany(
                {
                    where: {
                        status: 'PENDING',

                        purchase: {
                            creditCardId:
                                data.creditCardId,
                        },
                    },
                }
            )

        const cardUsedLimit =
            cardPendingInstallments.reduce(
                (acc, installment) =>
                    acc +
                    Number(installment.amount),
                0
            )

        const cardAvailableLimit =
            Number(card.totalLimit) -
            cardUsedLimit

        //
        // VALIDAÇÕES
        //



        if (
            data.amount >
            cardAvailableLimit
        ) {
            throw new LimitExceededError(
                'Card has insufficient limit'
            )
        }

        //
        // COMPETÊNCIA FINANCEIRA
        //

        const purchaseDay =
            data.purchaseDate.getDate()

        let competenceMonth =
            data.purchaseDate.getMonth() + 1

        let competenceYear =
            data.purchaseDate.getFullYear()

        //
        // COMPRA APÓS FECHAMENTO
        //

        if (
            purchaseDay > card.closingDay
        ) {
            competenceMonth += 1

            if (competenceMonth > 12) {
                competenceMonth = 1

                competenceYear += 1
            }
        }

        //
        // DISTRIBUIÇÃO FINANCEIRA
        //

        const baseInstallment =
            Math.floor(
                (data.amount /
                    data.installments) *
                100
            ) / 100

        const totalBase =
            baseInstallment *
            data.installments

        const difference = Number(
            (
                data.amount - totalBase
            ).toFixed(2)
        )

        //
        // TRANSACTION
        //

        return prisma.$transaction(
            async (tx) => {
                //
                // CRIA PURCHASE
                //

                const purchase =
                    await tx.purchase.create({
                        data: {
                            description:
                                data.description,

                            amount: data.amount,

                            installments:
                                data.installments,

                            purchaseDate:
                                data.purchaseDate,

                            userId: data.userId,

                            creditCardId:
                                data.creditCardId,
                        },
                    })

                //
                // CONTROLE DE FATURAS
                //

                const processedInvoices =
                    new Set<string>()

                //
                // GERA PARCELAS
                //

                for (
                    let i = 0;
                    i < data.installments;
                    i++
                ) {
                    let installmentAmount =
                        baseInstallment

                    //
                    // ÚLTIMA PARCELA
                    //

                    if (
                        i ===
                        data.installments - 1
                    ) {
                        installmentAmount +=
                            difference
                    }

                    let currentMonth =
                        competenceMonth + i

                    let currentYear =
                        competenceYear

                    //
                    // ROLLOVER ANO
                    //

                    while (currentMonth > 12) {
                        currentMonth -= 12

                        currentYear += 1
                    }

                    //
                    // VALIDA FATURA
                    //

                    const existingInvoice =
                        await tx.invoice.findUnique({
                            where: {
                                creditCardId_month_year: {
                                    creditCardId:
                                        data.creditCardId,

                                    month:
                                        currentMonth,

                                    year:
                                        currentYear,
                                },
                            },
                        })

              
                        const invoiceStatus =
                            invoiceLifecycle.getInvoiceStatus(
                                {
                                    month:
                                        currentMonth,

                                    year:
                                        currentYear,

                                    status:
                                        existingInvoice?.status ?? 'OPEN',

                                    paidAt:
                                        existingInvoice?.paidAt ?? null,

                                    closingDay:
                                        card.closingDay,
                                }
                            )

                        if (invoiceStatus === 'CLOSED') {
                            throw new InvoiceClosedError(`Invoice ${currentMonth}/${currentYear} is closed`)
                        }

                        if (invoiceStatus === 'PAID') {
                            throw new InvoicePaidError(`Invoice ${currentMonth}/${currentYear} is already paid`)
                        }
                  

                    //
                    // CRIA PARCELA
                    //

                    await tx.purchaseInstallment.create(
                        {
                            data: {
                                purchaseId:
                                    purchase.id,

                                userId: data.userId,

                                installmentNumber:
                                    i + 1,

                                amount:
                                    installmentAmount,

                                competenceMonth:
                                    currentMonth,

                                competenceYear:
                                    currentYear,

                                status: 'PENDING',
                            },
                        }
                    )

                    //
                    // EVITA DUPLICIDADE
                    //

                    const invoiceKey =
                        `${currentMonth}-${currentYear}`

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

                    //
                    // GARANTE INVOICE
                    //

                    await invoiceEngine.ensureInvoiceExists(
                        data.creditCardId,
                        currentMonth,
                        currentYear
                    )
                }

                return purchase
            }
        )
    }
}