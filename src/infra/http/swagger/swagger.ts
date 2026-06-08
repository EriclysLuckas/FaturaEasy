import { FastifyInstance }
  from 'fastify'

import fastifySwagger
  from '@fastify/swagger'

import fastifySwaggerUi
  from '@fastify/swagger-ui'

export async function setupSwagger(
  app: FastifyInstance
) {
  //
  // OPENAPI
  //

  await app.register(
    fastifySwagger,
    {
      openapi: {
        openapi: '3.0.0',

        info: {
          title: 'FaturaEasy',

          description:
            'API de gestão financeira multiusuário',

          version: '1.0.0',
        },

        servers: [
          {
            url:
              'http://localhost:3333',

            description:
              'Development server',
          },
        ],

        tags: [
          {
            name: 'Auth',
            description:
              'Autenticação',
          },

          {
            name: 'Users',
            description:
              'Usuários',
          },

          {
            name: 'Cards',
            description:
              'Cartões',
          },

          {
            name: 'Purchases',
            description:
              'Compras',
          },

          {
            name: 'Invoices',
            description:
              'Faturas',
          },

          {
            name: 'Payments',
            description:
              'Pagamentos',
          },
        ],

        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',

              scheme: 'bearer',

              bearerFormat:
                'JWT',
            },
          },
        },
      },
    }
  )

  //
  // SWAGGER UI
  //

  await app.register(
    fastifySwaggerUi,
    {
      routePrefix: '/docs',

      uiConfig: {
        docExpansion:
          'list',

        deepLinking: false,
      },
    }
  )
}