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

    // busca vínculo do usuário com cartão
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

    // calcula limite já utilizado
   const pendingInstallments =
  await prisma.purchaseInstallment.findMany({
    where: {
      userId: data.userId,

      status: 'PENDING',

      purchase: {
        creditCardId:
          data.creditCardId,
      },
    },
  })

    const usedLimit =
      pendingInstallments.reduce(
        (acc, installment) =>
          acc +
          Number(installment.amount),
        0
      )

    const availableLimit =
      Number(cardLink.limitGranted) -
      usedLimit

    // valida limite disponível
    if (data.amount > availableLimit) {
      throw new Error(
        'Insufficient limit'
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

    // calcula competência inicial
    const purchaseDay =
      data.purchaseDate.getDate()

    let competenceMonth =
      data.purchaseDate.getMonth() + 1

    let competenceYear =
      data.purchaseDate.getFullYear()

    // compra após fechamento entra na próxima competência
    if (
      purchaseDay > card.closingDay
    ) {
      competenceMonth += 1

      if (competenceMonth > 12) {
        competenceMonth = 1

        competenceYear += 1
      }
    }

    // distribuição financeira correta
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