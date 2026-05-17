// src/modules/invoices/invoice.service.ts

import { prisma } from '../../infra/database/prisma.js'

import { PermissionService } from '../permissions/permissions.service.js'

interface GetInvoiceInput {
  userId: string
  creditCardId: string
  month: number
  year: number
}

export class InvoiceService {
  private permissionService =
    new PermissionService()

  async getInvoice({
    userId,
    creditCardId,
    month,
    year,
  }: GetInvoiceInput) {
    // 🔐 valida permissões
    const isOwner =
      await this.permissionService.isCardOwner(
        userId,
        creditCardId
      )

    const isCardUser =
      await this.permissionService.isCardUser(
        userId,
        creditCardId
      )

    if (!isOwner && !isCardUser) {
      throw new Error('Access denied')
    }

    // 💳 busca cartão
    const card =
      await prisma.creditCard.findUnique({
        where: {
          id: creditCardId,
        },

        select: {
          id: true,
          name: true,
          totalLimit: true,
          closingDay: true,
          dueDay: true,
        },
      })

    if (!card) {
      throw new Error('Card not found')
    }

    // 📦 busca parcelas da competência
    const installments =
      await prisma.purchaseInstallment.findMany(
        {
          where: {
            competenceMonth: month,

            competenceYear: year,

            status: 'PENDING',

            purchase: {
              creditCardId,
            },

            // usuário secundário vê apenas as próprias parcelas
            ...(isOwner
              ? {}
              : {
                  userId,
                }),
          },

          include: {
            purchase: {
              select: {
                id: true,
                description: true,
                purchaseDate: true,
              },
            },

            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },

          orderBy: [
            {
              purchase: {
                purchaseDate: 'asc',
              },
            },
            {
              installmentNumber: 'asc',
            },
          ],
        }
      )

    // 💰 total da invoice
    const total =
      installments.reduce(
        (acc, installment) =>
          acc +
          Number(installment.amount),
        0
      )

    // 👥 total por usuário
    let totalsByUser: Record<
      string,
      {
        userId: string
        name: string
        total: number
      }
    > | null = null

    // apenas owner visualiza agrupamento completo
    if (isOwner) {
      totalsByUser =
        installments.reduce(
          (acc, installment) => {
            const key =
              installment.user.id

            if (!acc[key]) {
              acc[key] = {
                userId:
                  installment.user.id,

                name:
                  installment.user.name,

                total: 0,
              }
            }

            acc[key].total += Number(
              installment.amount
            )

            return acc
          },
          {} as Record<
            string,
            {
              userId: string
              name: string
              total: number
            }
          >
        )
    }

    // 📄 retorno da invoice dinâmica
    return {
      card: {
        id: card.id,

        name: card.name,

        totalLimit: Number(
          card.totalLimit
        ),

        closingDay: card.closingDay,

        dueDay: card.dueDay,
      },

      competence: {
        month,
        year,
      },

      total,

      installments: installments.map(
        (installment) => ({
          id: installment.id,

          amount: Number(
            installment.amount
          ),

          installmentNumber:
            installment.installmentNumber,

          status: installment.status,

          purchase: {
            id:
              installment.purchase.id,

            description:
              installment.purchase
                .description,

            purchaseDate:
              installment.purchase
                .purchaseDate,
          },

          user: {
            id: installment.user.id,

            name:
              installment.user.name,

            email:
              installment.user.email,
          },
        })
      ),

      totalsByUser,
    }
  }
}