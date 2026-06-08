// src/modules/cards/card.service.ts

import { prisma } from '../../infra/database/prisma.js'

import { AppError }
  from '../../shared/errors/app-error.js'

import { PermissionService }
  from '../permissions/permissions.service.js'

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
  //  CRIAR CARTÃO
  //

  async create(
    data: CreateCreditCardInput
  ) {
    return prisma.$transaction(
      async (tx) => {
        //
        //  cria cartão
        //

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

        //
        //  owner também é usuário
        //

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

  //
  //  ADICIONAR USUÁRIO
  //

  async addUserToCard(
    data: AddUserToCardInput
  ) {
    //
    //  valida owner
    //

    const isOwner =
      await permissionService.isCardOwner(
        data.ownerId,
        data.creditCardId
      )

    if (!isOwner) {
      throw new AppError(
        'Only owner can add users',
        403
      )
    }

    //
    //  busca usuário
    //

    const user =
      await prisma.user.findUnique({
        where: {
          email: data.userEmail,
        },
      })

    if (!user) {
      throw new AppError(
        'User not found',
        404
      )
    }

    //
    //  impede owner duplicado
    //

    if (user.id === data.ownerId) {
      throw new AppError(
        'Owner already belongs to the card',
        400
      )
    }

    //
    //  verifica vínculo existente
    //

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
      throw new AppError(
        'User already linked to this card',
        400
      )
    }

    //
    //  cria vínculo
    //

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

  //
  //  LISTAR CARTÕES
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
      id: item.creditCard.id,

      name:
        item.creditCard.name,

      totalLimit: Number(
        item.creditCard.totalLimit
      ),

      closingDay:
        item.creditCard
          .closingDay,

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
            id: link.user.id,

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
  //  BUSCAR CARTÃO
  //

  async getCardById(
    data: GetCardInput
  ) {
    //
    //  valida acesso
    //

    const isCardUser =
      await permissionService.isCardUser(
        data.userId,
        data.creditCardId
      )

    if (!isCardUser) {
      throw new AppError(
        'Access denied',
        403
      )
    }

    //
    // busca cartão
    //

    const card =
      await prisma.creditCard.findUnique(
        {
          where: {
            id: data.creditCardId,
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
      throw new AppError(
        'Card not found',
        404
      )
    }

    return {
      id: card.id,

      name: card.name,

      totalLimit: Number(
        card.totalLimit
      ),

      closingDay:
        card.closingDay,

      dueDay: card.dueDay,

      ownerId: card.ownerId,

      users: card.users.map(
        (link) => ({
          id: link.user.id,

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
  //  ATUALIZAR CARTÃO
  //

  async updateCard(
    data: UpdateCardInput
  ) {
    //
    //  valida owner
    //

    const isOwner =
      await permissionService.isCardOwner(
        data.ownerId,
        data.creditCardId
      )

    if (!isOwner) {
      throw new AppError(
        'Only owner can update card',
        403
      )
    }

    //
    //  busca cartão
    //

    const card =
      await prisma.creditCard.findUnique({
        where: {
          id: data.creditCardId,
        },
      })

    if (!card) {
      throw new AppError(
        'Card not found',
        404
      )
    }

    //
    //  atualiza
    //

    return prisma.creditCard.update({
      where: {
        id: data.creditCardId,
      },

      data: {
        name: data.name,

        totalLimit:
          data.totalLimit,

        closingDay:
          data.closingDay,

        dueDay: data.dueDay,
      },
    })
  }

  //
  //  USUÁRIOS DO CARTÃO
  //

  async getCardUsers(
    data: GetCardUsersInput
  ) {
    //
    // valida acesso
    //

    const hasAccess =
      await permissionService.isCardUser(
        data.requesterId,
        data.creditCardId
      )

    if (!hasAccess) {
      throw new AppError(
        'Access denied',
        403
      )
    }

    //
    //  busca usuários
    //

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
      userId: link.user.id,

      name: link.user.name,

      email: link.user.email,

      limitGranted: Number(
        link.limitGranted
      ),

      joinedAt:
        link.user.createdAt,
    }))
  }
}