import { prisma }
  from '../../infra/database/prisma.js'

import { ForbiddenError }
  from '../../shared/errors/forbidden-error.js'

import { NotFoundError }
  from '../../shared/errors/not-found-error.js'

import {
  LimitExceededError,
  InvoiceClosedError,
  InvoicePaidError,
} from '../../shared/errors/financial-erros.js'

import { toCents }
  from '../../shared/utils/money.js'

import { PermissionService }
  from '../permissions/permissions.service.js'

import { InvoiceEngineService }
  from '../invoices/invoice-engine.service.js'

import { InvoiceLifecycleService }
  from '../invoices/invoice-lifecycle.service.js'

import { CreditCardLock }
  from '../../infra/database/locks/credit-card.lock.js'

import type { CreatePurchaseInput }
  from './purchase.types.js'


const permissionService =
  new PermissionService()

const invoiceEngine =
  new InvoiceEngineService()

const invoiceLifecycle =
  new InvoiceLifecycleService()

const creditCardLock =
  new CreditCardLock()


export class PurchaseCreateService {

  async execute(
    data: CreatePurchaseInput
  ) {

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
        // VALIDA USUÁRIO DO CARTÃO
        //

        const isCardUser =
          await permissionService.isCardUser(
            data.userId,
            data.creditCardId,
            tx
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
          await tx.creditCardUser.findUnique({
            where: {
              userId_creditCardId: {
                userId:
                  data.userId,

                creditCardId:
                  data.creditCardId,
              },
            },
          })

        if (!cardLink) {
          throw new NotFoundError(
            'Card link not found'
          )
        }


        //
        // BUSCA CARTÃO
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
        // VALOR DA COMPRA EM CENTAVOS
        //
        // Exemplo:
        //
        // R$ 100,50
        // ↓
        // 10050 centavos
        //

        const amountCents =
          toCents(data.amount)


        //
        // LIMITE INDIVIDUAL
        //

        const userPendingInstallments =
          await tx.purchaseInstallment.findMany({
            where: {
              userId:
                data.userId,

              status:
                'PENDING',

              purchase: {
                creditCardId:
                  data.creditCardId,
              },
            },
          })


        //
        // SOMA DO LIMITE UTILIZADO
        // EM CENTAVOS
        //

        const userUsedLimitCents =
          userPendingInstallments.reduce(
            (
              acc,
              installment
            ) =>
              acc +
              toCents(
                installment.amount
              ),
            0
          )


        //
        // LIMITE CONCEDIDO AO USUÁRIO
        // EM CENTAVOS
        //

        const userGrantedLimitCents =
          toCents(
            cardLink.limitGranted
          )


        //
        // LIMITE DISPONÍVEL
        //

        const userAvailableLimitCents =
          userGrantedLimitCents -
          userUsedLimitCents


        //
        // VALIDA LIMITE INDIVIDUAL
        //

        if (
          amountCents >
          userAvailableLimitCents
        ) {
          throw new LimitExceededError(
            'User limit exceeded'
          )
        }


        //
        // LIMITE GLOBAL
        //

        const cardPendingInstallments =
          await tx.purchaseInstallment.findMany({
            where: {
              status:
                'PENDING',

              purchase: {
                creditCardId:
                  data.creditCardId,
              },
            },
          })


        //
        // SOMA DO LIMITE GLOBAL
        // EM CENTAVOS
        //

        const cardUsedLimitCents =
          cardPendingInstallments.reduce(
            (
              acc,
              installment
            ) =>
              acc +
              toCents(
                installment.amount
              ),
            0
          )


        //
        // LIMITE TOTAL DO CARTÃO
        // EM CENTAVOS
        //

        const cardTotalLimitCents =
          toCents(
            card.totalLimit
          )


        //
        // LIMITE GLOBAL DISPONÍVEL
        //

        const cardAvailableLimitCents =
          cardTotalLimitCents -
          cardUsedLimitCents


        //
        // VALIDA LIMITE GLOBAL
        //

        if (
          amountCents >
          cardAvailableLimitCents
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
          purchaseDay >=
          card.closingDay
        ) {

          competenceMonth += 1

          if (
            competenceMonth > 12
          ) {

            competenceMonth = 1

            competenceYear += 1
          }
        }


        //
        // DISTRIBUIÇÃO FINANCEIRA
        //
        // Trabalhamos exclusivamente
        // com centavos inteiros.
        //
        // Exemplo:
        //
        // R$ 100,00 / 3
        //
        // 10000 / 3
        //
        // 1ª = 3333
        // 2ª = 3333
        // 3ª = 3334
        //
        // Soma = 10000
        //

        const baseInstallmentCents =
          Math.floor(
            amountCents /
            data.installments
          )

        const differenceCents =
          amountCents -
          (
            baseInstallmentCents *
            data.installments
          )


        //
        // CRIA PURCHASE
        //
        // O Prisma continua recebendo
        // o valor decimal original.
        //

        const purchase =
          await tx.purchase.create({
            data: {

              description:
                data.description,

              amount:
                data.amount,

              installments:
                data.installments,

              purchaseDate:
                data.purchaseDate,

              userId:
                data.userId,

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

          //
          // VALOR BASE DA PARCELA
          // EM CENTAVOS
          //

          let installmentAmountCents =
            baseInstallmentCents


          //
          // ÚLTIMA PARCELA RECEBE
          // EVENTUAL DIFERENÇA
          //

          if (
            i ===
            data.installments - 1
          ) {

            installmentAmountCents +=
              differenceCents
          }


          //
          // CONVERTE PARA VALOR DECIMAL
          // ANTES DE PERSISTIR
          //

          const installmentAmount =
            installmentAmountCents / 100


          //
          // COMPETÊNCIA DA PARCELA
          //

          let currentMonth =
            competenceMonth + i

          let currentYear =
            competenceYear


          //
          // ROLLOVER ANO
          //

          while (
            currentMonth > 12
          ) {

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


          //
          // STATUS DA FATURA
          //

          const invoiceStatus =
            invoiceLifecycle.getInvoiceStatus({
              month:
                currentMonth,

              year:
                currentYear,

              status:
                existingInvoice?.status ??
                'OPEN',

              paidAt:
                existingInvoice?.paidAt ??
                null,

              closingDay:
                card.closingDay,
            })


          //
          // FATURA FECHADA
          //

          if (
            invoiceStatus === 'CLOSED'
          ) {

            throw new InvoiceClosedError(
              `Invoice ${currentMonth}/${currentYear} is closed`
            )
          }


          //
          // FATURA PAGA
          //

          if (
            invoiceStatus === 'PAID'
          ) {

            throw new InvoicePaidError(
              `Invoice ${currentMonth}/${currentYear} is already paid`
            )
          }


          //
          // CRIA PARCELA
          //

          await tx.purchaseInstallment.create({
            data: {

              purchaseId:
                purchase.id,

              userId:
                data.userId,

              installmentNumber:
                i + 1,

              amount:
                installmentAmount,

              competenceMonth:
                currentMonth,

              competenceYear:
                currentYear,

              status:
                'PENDING',
            },
          })


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
            currentYear,
            tx
          )
        }


        //
        // RETORNA COMPRA
        //

        return purchase
      }
    )
  }
}

