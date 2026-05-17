import Fastify from 'fastify'
import cors from '@fastify/cors'
import fastifyJwt from '@fastify/jwt'



import { errorHandler } from './shared/errors/error-handler.js'
import { cardRoutes } from './modules/cards/card.routes.js'

import { jwtConfig } from './config/auth.js'
import { healthRoutes } from './routes/health.routes.js'
import { authRoutes } from './modules/auth/auth.routes.js'
import { userRoutes } from './modules/users/user.routes.js'
import { purchaseRoutes } from './modules/purchases/purchase.routes.js'
import { invoiceRoutes } from './modules/invoices/invoice.routes.js'
import { paymentRoutes } from './modules/payments/payment.routes.js'


export const app = Fastify({
  logger: true,
})

app.setErrorHandler(errorHandler)

app.register(cors)

app.register(fastifyJwt, jwtConfig)


//REGISTROS DE ROTAS
app.register(healthRoutes)
app.register(authRoutes)
app.register(userRoutes)
app.register(cardRoutes)
app.register(purchaseRoutes)
app.register(invoiceRoutes)
app.register(paymentRoutes)