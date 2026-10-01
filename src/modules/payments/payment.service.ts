import { prisma }
  from '../../infra/database/prisma.js'

import { PermissionService }
  from '../permissions/permissions.service.js'

import { NotFoundError }
  from '../../shared/errors/not-found-error.js'

import { ForbiddenError }
  from '../../shared/errors/forbidden-error.js'

import {
  InvoiceNotClosedError,
  NoPendingInstallmentsError,
  InvoicePaidError,
} from '../../shared/errors/financial-erros.js'

import { toCents }
  from '../../shared/utils/money.js'


interface PayInvoiceInput {
  invoiceId: string
  userId: string
}


export class PaymentService {

  private permissionService =
    new PermissionService()


  async payInvoice({
    invoiceId,
    userId,
  }: PayInvoiceInput) {

    //
    // BUSCA FATURA
    //

    const invoice =
      await prisma.invoice.findUnique({
        where: {
          id: invoiceId,
        },

        include: {
          creditCard: {
            select: {
              id: true,
              name: true,
              closingDay: true,
            },
          },
        },
      })


    if (!invoice) {
      throw new NotFoundError(
        'Invoice not found'
      )
    }


    //
    // SOMENTE O DONO PODE PAGAR
    //

    const isOwner =
      await this.permissionService.isCardOwner(
        userId,
        invoice.creditCardId
      )

    if (!isOwner) {
      throw new ForbiddenError(
        'Only the card owner can pay this invoice'
      )
    }


    //
    // FATURA JÁ PAGA
    //

    if (
      invoice.status === 'PAID'
    ) {
      throw new InvoicePaidError()
    }


    //
    // FATURA PRECISA ESTAR FECHADA
    //

    if (
      invoice.status !== 'CLOSED'
    ) {
      throw new InvoiceNotClosedError()
    }


    //
    // TRANSAÇÃO
    //

    return prisma.$transaction(
      async (tx) => {

        //
        // BUSCA PARCELAS PENDENTES
        //

        const pendingInstallments =
          await tx.purchaseInstallment.findMany({
            where: {
              competenceMonth:
                invoice.month,

              competenceYear:
                invoice.year,

              status:
                'PENDING',

              purchase: {
                creditCardId:
                  invoice.creditCardId,
              },
            },

            select: {
              id: true,
              amount: true,
            },
          })


        if (
          pendingInstallments.length === 0
        ) {
          throw new NoPendingInstallmentsError()
        }


        //
        // TOTAL PAGO
        //
        // O cálculo é feito em centavos
        // para evitar operações com
        // números decimais.
        //

        const totalPaidCents =
          pendingInstallments.reduce(
            (
              total,
              installment
            ) =>
              total +
              toCents(
                installment.amount
              ),
            0
          )


        //
        // CONVERTE PARA O FORMATO
        // DE RESPOSTA DA API
        //

        const totalPaid =
          totalPaidCents / 100


        //
        // MARCA PARCELAS COMO PAGAS
        //

        await tx.purchaseInstallment.updateMany({
          where: {
            id: {
              in:
                pendingInstallments.map(
                  (
                    installment
                  ) =>
                    installment.id
                ),
            },
          },

          data: {
            status:
              'PAID',
          },
        })


        //
        // ATUALIZA FATURA
        //

        const updatedInvoice =
          await tx.invoice.update({
            where: {
              id:
                invoice.id,
            },

            data: {
              status:
                'PAID',

              paidAt:
                new Date(),
            },
          })


        //
        // RETORNO
        //

        return {
          invoice: {
            id:
              updatedInvoice.id,

            status:
              updatedInvoice.status,

            month:
              updatedInvoice.month,

            year:
              updatedInvoice.year,

            paidAt:
              updatedInvoice.paidAt,
          },

          card: {
            id:
              invoice.creditCard.id,

            name:
              invoice.creditCard.name,
          },

          totalPaid,

          paidInstallments:
            pendingInstallments.length,
        }
      }
    )
  }
}