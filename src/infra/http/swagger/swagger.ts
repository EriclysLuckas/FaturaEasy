import { FastifyInstance }
  from 'fastify'

import fastifySwagger
  from '@fastify/swagger'

import fastifySwaggerUi
  from '@fastify/swagger-ui'

import {
  jsonSchemaTransform
} from 'fastify-type-provider-zod'

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
    },

    transform:
      jsonSchemaTransform,
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