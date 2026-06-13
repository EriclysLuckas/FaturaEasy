import Fastify from 'fastify'

import cors from '@fastify/cors'

import fastifyJwt from '@fastify/jwt'

import { startScheduler }  from './jobs/scheduler.js'

import { errorHandler }  from './shared/errors/error-handler.js'

import { jwtConfig }  from './config/auth.js'

import { healthRoutes }  from './routes/health.routes.js'

import { authRoutes }  from './modules/auth/auth.routes.js'

import { userRoutes }  from './modules/users/user.routes.js'

import { cardRoutes }  from './modules/cards/card.routes.js'

import { purchaseRoutes }  from './modules/purchases/purchase.routes.js'

import { invoiceRoutes }  from './modules/invoices/invoice.routes.js'

import { paymentRoutes }  from './modules/payments/payment.routes.js'

import { setupSwagger }  from './infra/http/swagger/swagger.js'

import { serializerCompiler }
  from 'fastify-type-provider-zod'

import { validatorCompiler }
  from 'fastify-type-provider-zod'


startScheduler()

export const app = Fastify({
  logger: true,
})

app.setValidatorCompiler(
  validatorCompiler
)

app.setSerializerCompiler(
  serializerCompiler
)
//
// PLUGINS
//

await app.register(cors)

await app.register(fastifyJwt, jwtConfig)

//
// SWAGGER
//

await setupSwagger(app)

//
// ERROR HANDLER
//

app.setErrorHandler(errorHandler)

//
// ROUTES
//

await app.register(healthRoutes)
await app.register(authRoutes)
await app.register(userRoutes)
await app.register(cardRoutes)
await app.register(purchaseRoutes)
await app.register(invoiceRoutes)
await app.register(paymentRoutes)