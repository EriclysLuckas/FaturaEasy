
import { prisma }
    from '../../infra/database/prisma.js'

import { ForbiddenError }
    from '../../shared/errors/forbidden-error.js'

import { NotFoundError }
    from '../../shared/errors/not-found-error.js'

import { PermissionService }
    from '../permissions/permissions.service.js'

import type {
    GetPurchaseInput,
    ListPurchasesInput,
} from './purchase.types.js'


const permissionService =
    new PermissionService()


export class PurchaseQueryService {

    async list(
        data: ListPurchasesInput
    ) {

        const whereClause: any = {}


        //
        // VALIDA ACESSO AO CARTÃO
        //

        if (data.creditCardId) {

            const isCardUser =
                await permissionService.isCardUser(
                    data.userId,
                    data.creditCardId
                )

            if (!isCardUser) {
                throw new ForbiddenError(
                    'Access denied'
                )
            }

            whereClause.creditCardId =
                data.creditCardId
        }


        //
        // FILTRO POR COMPETÊNCIA
        //

        if (
            data.month ||
            data.year
        ) {

            whereClause.installmentsData = {
                some: {

                    ...(data.month && {
                        competenceMonth:
                            data.month,
                    }),

                    ...(data.year && {
                        competenceYear:
                            data.year,
                    }),
                },
            }
        }


        //
        // BUSCA COMPRAS
        //

        const purchases =
            await prisma.purchase.findMany({

                where:
                    whereClause,

                include: {

                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },

                    installmentsData:
                        true,
                },

                orderBy: {
                    purchaseDate:
                        'desc',
                },
            })


        //
        // RETORNO
        //
        // Number() aqui é correto.
        //
        // Não estamos calculando dinheiro.
        // Estamos apenas convertendo o
        // Prisma.Decimal para number para
        // a resposta da API.
        //

        return purchases.map(
            (purchase) => ({

                id:
                    purchase.id,

                description:
                    purchase.description,

                amount:
                    Number(
                        purchase.amount
                    ),

                installments:
                    purchase.installments,

                purchaseDate:
                    purchase.purchaseDate,

                userId:
                    purchase.userId,

                creditCardId:
                    purchase.creditCardId,

                createdAt:
                    purchase.createdAt,
            })
        )
    }


    async getById(
        data: GetPurchaseInput
    ) {

        //
        // BUSCA COMPRA
        //

        const purchase =
            await prisma.purchase.findUnique({

                where: {
                    id:
                        data.id,
                },

                include: {

                    installmentsData:
                        true,

                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },

                    creditCard: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            })


        //
        // VALIDA EXISTÊNCIA
        //

        if (!purchase) {
            throw new NotFoundError(
                'Purchase not found'
            )
        }


        //
        // VALIDA ACESSO
        //

        const isCardUser =
            await permissionService.isCardUser(
                data.userId,
                purchase.creditCardId
            )

        if (!isCardUser) {
            throw new ForbiddenError(
                'Access denied'
            )
        }


        //
        // RETORNO
        //

        return {

            id:
                purchase.id,

            description:
                purchase.description,

            //
            // Number() é apenas conversão
            // para resposta da API.
            //

            amount:
                Number(
                    purchase.amount
                ),

            installments:
                purchase.installments,

            purchaseDate:
                purchase.purchaseDate,

            createdAt:
                purchase.createdAt,

            user:
                purchase.user,

            creditCard:
                purchase.creditCard,

            installmentsData:
                purchase.installmentsData.map(
                    (installment) => ({

                        ...installment,

                        //
                        // Também é apenas conversão
                        // para resposta da API.
                        //

                        amount:
                            Number(
                                installment.amount
                            ),
                    })
                ),
        }
    }
}