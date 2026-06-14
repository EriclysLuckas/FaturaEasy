import { FastifyInstance }
  from 'fastify'

import fastifySwagger
  from '@fastify/swagger'

import fastifySwaggerUi
  from '@fastify/swagger-ui'

import {
  jsonSchemaTransform,
} from 'fastify-type-provider-zod'

export async function setupSwagger(
  app: FastifyInstance
) {
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

        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
            },
          },
        },
      },

      transform:
        jsonSchemaTransform,
    }
  )

  await app.register(
    fastifySwaggerUi,
    {
      routePrefix: '/docs',

      uiConfig: {
        docExpansion: 'list',
        deepLinking: false,
      },
    }
  )
}