// // src/modules/payments/payment.routes.ts

// import { FastifyInstance } from 'fastify'

// import { authMiddleware }
//   from '../../shared/middlewares/auth.middleware.js'

// import { PaymentController }
//   from './payment.controller.js'

// import {
//   payInvoiceParamsSchema,
//   payInvoiceDataSchema,
// } from './payment.schema.js'

// import {
//   errorResponseSchema,
// } from '../../shared/errors/error.schema.js'

// const paymentController =
//   new PaymentController()

// export async function paymentRoutes(
//   app: FastifyInstance
// ) {
//   app.post(
//     '/invoices/:invoiceId/pay',
//     {
//       preHandler: [authMiddleware],

//       schema: {
//         tags: ['Payments'],

//         summary: 'Pay invoice',

//         description:
//           'Allows only the card owner to pay a CLOSED invoice. Marks all pending installments as PAID.',

//         security: [
//           {
//             bearerAuth: [],
//           },
//         ],

//         params:
//           payInvoiceParamsSchema,

//         response: {
//           200:
//             payInvoiceDataSchema,

//           400:
//             errorResponseSchema,

//           403:
//             errorResponseSchema,

//           404:
//             errorResponseSchema,

//           409:
//             errorResponseSchema,

//           500:
//             errorResponseSchema,
//         },
//       },
//     },

//     paymentController.payInvoice
//   )
// }


// src/modules/payments/payment.routes.ts

import { FastifyInstance } from 'fastify'

import { ZodTypeProvider }
  from 'fastify-type-provider-zod'

import { authMiddleware }
  from '../../shared/middlewares/auth.middleware.js'

import { PaymentController }
  from './payment.controller.js'

import {
  payInvoiceParamsSchema,
  payInvoiceDataSchema,
} from './payment.schema.js'

// Importando o schema de sucesso padronizado (se você usa o wrapper)
import {
  successResponseSchema,
} from '../../infra/http/swagger/schemas/success.schemas.js'

// Importando os schemas de erro granulares do seu projeto
import {
  unauthorizedResponseSchema,
  forbiddenResponseSchema,
  validationResponseSchema,
  notFoundResponseSchema,
  conflictResponseSchema,
  internalServerResponseSchema,
} from '../../infra/http/swagger/response.schemas.js'

const paymentController =
  new PaymentController()

export async function paymentRoutes(
  app: FastifyInstance
) {
  // 1. Injetando o ZodTypeProvider para inferência perfeita de tipos
  const zodApp =
    app.withTypeProvider<ZodTypeProvider>()

  zodApp.post(
    '/invoices/:invoiceId/pay',
    {
      preHandler: [authMiddleware],

      schema: {
        tags: ['Payments'],

        summary: 'Pay invoice',

        description:
          'Allows only the card owner to pay a CLOSED invoice. Marks all pending installments as PAID.',

        security: [
          {
            bearerAuth: [],
          },
        ],

        params:
          payInvoiceParamsSchema,

        response: {
          // 2. Utilizando os schemas padronizados para cada código HTTP
          200:
            successResponseSchema(payInvoiceDataSchema), 
            // Obs: Se você não usar o successResponseSchema aqui, pode deixar apenas payInvoiceDataSchema

          400:
            validationResponseSchema, // Ex: Request mal formatada ou parâmetros inválidos

          401:
            unauthorizedResponseSchema, // Ex: Token JWT não enviado ou inválido

          403:
            forbiddenResponseSchema, // Ex: Usuário tentando pagar não é o Owner

          404:
            notFoundResponseSchema, // Ex: Fatura não encontrada no banco

          409:
            conflictResponseSchema, // Ex: Regras de negócio como "Fatura já paga" ou "Não fechada"

          500:
            internalServerResponseSchema, // Ex: Erro de banco de dados
        },
      },
    },

    paymentController.payInvoice
  )
}
