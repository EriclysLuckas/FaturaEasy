// src/modules/purchases/purchase.service.ts

import { prisma } from '../../infra/database/prisma.js'

import { PermissionService } from '../permissions/permissions.service.js'

const permissionService =
  new PermissionService()

interface CreatePurchaseInput {
  description: string

  amount: number

  installments: number

  purchaseDate: Date

  creditCardId: string

  userId: string
}

export class PurchaseService {
  async create(
    data: CreatePurchaseInput
  ) {
    // valida se usuário pertence ao cartão
    const isCardUser =
      await permissionService.isCardUser(
        data.userId,
        data.creditCardId
      )

    if (!isCardUser) {
      throw new Error(
        'User does not belong to this card'
      )
    }

    // busca vínculo usuário/cartão
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
      throw new Error(
        'Card link not found'
      )
    }

    // busca cartão
    const card =
      await prisma.creditCard.findUnique({
        where: {
          id: data.creditCardId,
        },
      })

    if (!card) {
      throw new Error(
        'Card not found'
      )
    }

    //
    // 🔹 LIMITE INDIVIDUAL DO USUÁRIO
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

    //
    // 🔹 LIMITE GLOBAL DO CARTÃO
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
    // 🔹 VALIDAÇÕES
    //

    if (
      data.amount >
      userAvailableLimit
    ) {
      throw new Error(
        'User limit exceeded'
      )
    }

    if (
      data.amount >
      cardAvailableLimit
    ) {
      throw new Error(
        'Card has insufficient limit'
      )
    }

    //
    // 🔹 COMPETÊNCIA FINANCEIRA
    //

    const purchaseDay =
      data.purchaseDate.getDate()

    let competenceMonth =
      data.purchaseDate.getMonth() + 1

    let competenceYear =
      data.purchaseDate.getFullYear()

    // compra após fechamento
    // entra na próxima competência
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
    // 🔹 DISTRIBUIÇÃO FINANCEIRA
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
    // 🔹 TRANSACTION
    //

    return prisma.$transaction(
      async (tx) => {
        // cria compra
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

        // gera parcelas
        for (
          let i = 0;
          i < data.installments;
          i++
        ) {
          let installmentAmount =
            baseInstallment

          // última parcela absorve diferença decimal
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

          // rollover de ano
          while (currentMonth > 12) {
            currentMonth -= 12

            currentYear += 1
          }

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
        }

        return purchase
      }
    )
  }
}