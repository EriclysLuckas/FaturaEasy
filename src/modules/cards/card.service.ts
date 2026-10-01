
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

import { toCents }
  from '../../shared/utils/money.js'

import { CreditCardLock }
  from '../../infra/database/locks/credit-card.lock.js'


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


const creditCardLock =
  new CreditCardLock()


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
              name:
                data.name,

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

          totalLimit:
            Number(
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

    return prisma.$transaction(
      async (tx) => {
        //
        // LOCK DO CARTÃO
        //

        await creditCardLock.execute(
          tx,
          data.creditCardId
        )

        //
        // BUSCAR CARTÃO
        //

        const card =
          await tx.creditCard.findUnique({
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
        // BUSCAR USUÁRIO
        //

        const user =
          await tx.user.findUnique({
            where: {
              email: data.userEmail,
            },
          })

        if (!user) {
          throw new NotFoundError(
            'User not found'
          )
        }

        //
        // OWNER NÃO PODE SER ADICIONADO
        //

        if (
          user.id === data.ownerId
        ) {
          throw new ConflictError(
            'Owner already belongs to the card'
          )
        }

        //
        // VERIFICAR VÍNCULO EXISTENTE
        //

        const existingLink =
          await tx.creditCardUser.findUnique({
            where: {
              userId_creditCardId: {
                userId: user.id,
                creditCardId:
                  data.creditCardId,
              },
            },
          })

        if (existingLink) {
          throw new ConflictError(
            'User already linked to this card'
          )
        }

        //
        // VALIDAR LIMITE CONCEDIDO
        //

        const totalLimitCents =
          toCents(card.totalLimit)

        const limitGrantedCents =
          toCents(data.limitGranted)

        if (
          limitGrantedCents >
          totalLimitCents
        ) {
          throw new ConflictError(
            'Granted limit cannot be greater than the card total limit'
          )
        }

        //
        // CRIAR VÍNCULO
        //

        const link =
          await tx.creditCardUser.create({
            data: {
              userId: user.id,

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

          limitGranted:
            Number(
              link.limitGranted
            ),
        }
      }
    )
  }


  //
  // LISTAR CARTÕES
  //

  async listCards(
    userId: string
  ) {

    const cards =
      await prisma.creditCardUser.findMany({
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
      })


    return cards.map(
      (item) => ({

        id:
          item.creditCard.id,

        name:
          item.creditCard.name,

        totalLimit:
          Number(
            item.creditCard.totalLimit
          ),

        closingDay:
          item.creditCard.closingDay,

        dueDay:
          item.creditCard.dueDay,

        ownerId:
          item.creditCard.ownerId,

        yourLimit:
          Number(
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

              limitGranted:
                Number(
                  link.limitGranted
                ),
            })
          ),
      })
    )
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
      await prisma.creditCard.findUnique({
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
      })


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

      totalLimit:
        Number(
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

            limitGranted:
              Number(
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


    return prisma.$transaction(
      async (tx) => {

        //
        // LOCK DO CARTÃO
        //

        await creditCardLock.execute(
          tx,
          data.creditCardId
        )


        //
        // BUSCAR CARTÃO
        //

        const card =
          await tx.creditCard.findUnique({
            where: {
              id:
                data.creditCardId,
            },
          })


        if (!card) {

          throw new NotFoundError(
            'Card not found'
          )
        }


        //
        // VALIDAR NOVO LIMITE
        //

        if (
          data.totalLimit !== undefined
        ) {

          const newLimitCents =
            toCents(
              data.totalLimit
            )


          //
          // COMPRAS AINDA COMPROMETIDAS
          //

          const pendingInstallments =
            await tx.purchaseInstallment.aggregate({

              where: {

                status:
                  'PENDING',

                purchase: {

                  creditCardId:
                    data.creditCardId,
                },
              },

              _sum: {

                amount:
                  true,
              },
            })


          const pendingAmountCents =
            pendingInstallments
              ._sum
              .amount
              ? toCents(
                pendingInstallments
                  ._sum
                  .amount
              )
              : 0


          if (
            newLimitCents <
            pendingAmountCents
          ) {

            throw new ConflictError(
              'Total limit cannot be lower than the amount already committed'
            )
          }


          //
          // MAIOR LIMITE CONCEDIDO
          // AOS USUÁRIOS SECUNDÁRIOS
          //
          // O OWNER NÃO ENTRA NESSA
          // VALIDAÇÃO.
          //
          // O limite do owner acompanha
          // o totalLimit do cartão.
          //

          const secondaryLimits =
            await tx.creditCardUser.findMany({

              where: {

                creditCardId:
                  data.creditCardId,

                userId: {
                  not:
                    card.ownerId,
                },
              },

              select: {

                limitGranted:
                  true,
              },
            })


          const largestSecondaryLimitCents =
            secondaryLimits.reduce(
              (
                largest,
                user
              ) => {

                const limitCents =
                  toCents(
                    user.limitGranted
                  )

                return Math.max(
                  largest,
                  limitCents
                )
              },
              0
            )


          if (
            newLimitCents <
            largestSecondaryLimitCents
          ) {

            throw new ConflictError(
              'Total limit cannot be lower than a limit already granted to a secondary user'
            )
          }
        }


        //
        // ATUALIZAR CARTÃO
        //

        const updatedCard =
          await tx.creditCard.update({

            where: {

              id:
                data.creditCardId,
            },

            data: {

              name:
                data.name,

              totalLimit:
                data.totalLimit,

              closingDay:
                data.closingDay,

              dueDay:
                data.dueDay,
            },
          })


        //
        // SINCRONIZAR LIMITE DO OWNER
        //
        // O CreditCardUser do owner
        // representa o limite total que
        // ele possui no cartão.
        //

        if (
          data.totalLimit !== undefined
        ) {

          await tx.creditCardUser.update({

            where: {

              userId_creditCardId: {

                userId:
                  card.ownerId,

                creditCardId:
                  data.creditCardId,
              },
            },

            data: {

              limitGranted:
                data.totalLimit,
            },
          })
        }


        //
        // RESPOSTA
        //

        return {

          id:
            updatedCard.id,

          name:
            updatedCard.name,

          totalLimit:
            Number(
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
    )
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
      await prisma.creditCardUser.findMany({

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

            name:
              'asc',
          },
        },
      })


    return users.map(
      (link) => ({

        userId:
          link.user.id,

        name:
          link.user.name,

        email:
          link.user.email,

        limitGranted:
          Number(
            link.limitGranted
          ),

        joinedAt:
          link.user.createdAt,
      })
    )
  }
}

