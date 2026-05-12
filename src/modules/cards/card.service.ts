import { prisma } from '../../infra/database/prisma.js'

import { PermissionService } from '../permissions/permissions.service.js'

const permissionService =
  new PermissionService()

interface CreateCreditCardInput {
  name: string
  totalLimit: number
  closingDay: number
  dueDay: number
  ownerId: string
}

interface AddUserToCardInput {
  ownerId: string
  creditCardId: string
  userEmail: string
  limitGranted: number
}

export class CardService {
  async create(
    data: CreateCreditCardInput
  ) {
    return prisma.$transaction(
      async (tx) => {
        // cria cartão
        const card =
          await tx.creditCard.create({
            data: {
              name: data.name,

              totalLimit:
                data.totalLimit,

              closingDay:
                data.closingDay,

              dueDay: data.dueDay,

              ownerId: data.ownerId,
            },
          })

        // owner também é usuário do cartão
        await tx.creditCardUser.create({
          data: {
            userId: data.ownerId,

            creditCardId: card.id,

            limitGranted:
              data.totalLimit,
          },
        })

        return card
      }
    )
  }

  async addUserToCard(
    data: AddUserToCardInput
  ) {
    // valida owner
    const isOwner =
      await permissionService.isCardOwner(
        data.ownerId,
        data.creditCardId
      )

    if (!isOwner) {
      throw new Error(
        'Only owner can add users'
      )
    }

    // busca usuário
    const user =
      await prisma.user.findUnique({
        where: {
          email: data.userEmail,
        },
      })

    if (!user) {
      throw new Error(
        'User not found'
      )
    }

    // impede owner duplicado
    if (user.id === data.ownerId) {
      throw new Error(
        'Owner already belongs to the card'
      )
    }

    // verifica vínculo existente
    const existingLink =
      await prisma.creditCardUser.findUnique(
        {
          where: {
            userId_creditCardId: {
              userId: user.id,

              creditCardId:
                data.creditCardId,
            },
          },
        }
      )

    if (existingLink) {
      throw new Error(
        'User already linked to this card'
      )
    }

    // cria vínculo
    return prisma.creditCardUser.create({
      data: {
        userId: user.id,

        creditCardId:
          data.creditCardId,

        limitGranted:
          data.limitGranted,
      },
    })
  }
}