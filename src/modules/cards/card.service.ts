// src/modules/cards/card.service.ts

import { prisma } from '../../infra/database/prisma.js'

import { PermissionService }
  from '../permissions/permissions.service.js'

import { ForbiddenError }
  from '../../shared/errors/forbidden-error.js'

import { NotFoundError }
  from '../../shared/errors/not-found-error.js'

import { ConflictError }
  from '../../shared/errors/conflict-error.js'

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

interface GetCardInput {
  userId: string
  creditCardId: string
}

interface UpdateCardInput {
  ownerId: string
  creditCardId: string

  name?: string
  totalLimit?: number
  closingDay?: number
  dueDay?: number
}

interface GetCardUsersInput {
  requesterId: string
  creditCardId: string
}

export class CardService {
  //
  // CRIAR CARTÃO
  //

 async create(
  data: CreateCreditCardInput
) {
  return prisma.$transaction(
    async (tx) => {
      const card =
        await tx.creditCard.create({
          data: {
            name: data.name,

            totalLimit:
              data.totalLimit,

            closingDay:
              data.closingDay,

            dueDay:
              data.dueDay,

            ownerId:
              data.ownerId,
          },
        })

      await tx.creditCardUser.create({
        data: {
          userId:
            data.ownerId,

          creditCardId:
            card.id,

          limitGranted:
            data.totalLimit,
        },
      })

      return {
        id:
          card.id,

        name:
          card.name,

        totalLimit: Number(
          card.totalLimit
        ),

        closingDay:
          card.closingDay,

        dueDay:
          card.dueDay,

        ownerId:
          card.ownerId,
      }
    }
  )
}

  //
  // ADICIONAR USUÁRIO
  //

async addUserToCard(
  data: AddUserToCardInput
) {
  const isOwner =
    await permissionService.isCardOwner(
      data.ownerId,
      data.creditCardId
    )

  if (!isOwner) {
    throw new ForbiddenError(
      'Only owner can add users'
    )
  }

  const user =
    await prisma.user.findUnique({
      where: {
        email: data.userEmail,
      },
    })

  if (!user) {
    throw new NotFoundError(
      'User not found'
    )
  }

  if (user.id === data.ownerId) {
    throw new ConflictError(
      'Owner already belongs to the card'
    )
  }

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
    throw new ConflictError(
      'User already linked to this card'
    )
  }

  const link =
    await prisma.creditCardUser.create({
      data: {
        userId:
          user.id,

        creditCardId:
          data.creditCardId,

        limitGranted:
          data.limitGranted,
      },
    })

  return {
    userId:
      link.userId,

    creditCardId:
      link.creditCardId,

    limitGranted: Number(
      link.limitGranted
    ),
  }
}

  //
  // LISTAR CARTÕES
  //

  async listCards(userId: string) {
    const cards =
      await prisma.creditCardUser.findMany(
        {
          where: {
            userId,
          },

          include: {
            creditCard: {
              include: {
                users: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        name: true,
                        email: true,
                      },
                    },
                  },
                },
              },
            },
          },
        }
      )

    return cards.map((item) => ({
      id:
        item.creditCard.id,

      name:
        item.creditCard.name,

      totalLimit: Number(
        item.creditCard.totalLimit
      ),

      closingDay:
        item.creditCard.closingDay,

      dueDay:
        item.creditCard.dueDay,

      ownerId:
        item.creditCard.ownerId,

      yourLimit: Number(
        item.limitGranted
      ),

      users:
        item.creditCard.users.map(
          (link) => ({
            id:
              link.user.id,

            name:
              link.user.name,

            email:
              link.user.email,

            limitGranted: Number(
              link.limitGranted
            ),
          })
        ),
    }))
  }

  //
  // BUSCAR CARTÃO
  //

  async getCardById(
    data: GetCardInput
  ) {
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

    const card =
      await prisma.creditCard.findUnique(
        {
          where: {
            id:
              data.creditCardId,
          },

          include: {
            users: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        }
      )

    if (!card) {
      throw new NotFoundError(
        'Card not found'
      )
    }

    return {
      id:
        card.id,

      name:
        card.name,

      totalLimit: Number(
        card.totalLimit
      ),

      closingDay:
        card.closingDay,

      dueDay:
        card.dueDay,

      ownerId:
        card.ownerId,

      users:
        card.users.map(
          (link) => ({
            id:
              link.user.id,

            name:
              link.user.name,

            email:
              link.user.email,

            limitGranted: Number(
              link.limitGranted
            ),
          })
        ),
    }
  }

  //
  // ATUALIZAR CARTÃO
  //

  async updateCard(
    data: UpdateCardInput
  ) {
    const isOwner =
      await permissionService.isCardOwner(
        data.ownerId,
        data.creditCardId
      )

    if (!isOwner) {
      throw new ForbiddenError(
        'Only owner can update card'
      )
    }

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

    const updatedCard =
      await prisma.creditCard.update({
        where: {
          id: data.creditCardId,
        },

        data: {
          name: data.name,
          totalLimit: data.totalLimit,
          closingDay: data.closingDay,
          dueDay: data.dueDay,
        },
      })

    return {
      id: updatedCard.id,

      name: updatedCard.name,

      totalLimit: Number(
        updatedCard.totalLimit
      ),

      closingDay:
        updatedCard.closingDay,

      dueDay:
        updatedCard.dueDay,

      ownerId:
        updatedCard.ownerId,
    }
    
  }

  //
  // USUÁRIOS DO CARTÃO
  //

  async getCardUsers(
    data: GetCardUsersInput
  ) {
    const hasAccess =
      await permissionService.isCardUser(
        data.requesterId,
        data.creditCardId
      )

    if (!hasAccess) {
      throw new ForbiddenError(
        'Access denied'
      )
    }

    const users =
      await prisma.creditCardUser.findMany(
        {
          where: {
            creditCardId:
              data.creditCardId,
          },

          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                createdAt: true,
              },
            },
          },

          orderBy: {
            user: {
              name: 'asc',
            },
          },
        }
      )

    return users.map((link) => ({
      userId:
        link.user.id,

      name:
        link.user.name,

      email:
        link.user.email,

      limitGranted: Number(
        link.limitGranted
      ),

      joinedAt:
        link.user.createdAt,
    }))
  }
}