import { FastifyInstance }
  from 'fastify'

import { AuthController }
  from './auth.controller.js'

const authController =
  new AuthController()

export async function authRoutes(
  app: FastifyInstance
) {
  //
  // REGISTER
  //

  app.post(
    '/register',
    {
      schema: {
        tags: ['Auth'],

        summary:
          'Cria uma nova conta',

        description:
          'Realiza cadastro de usuário na plataforma',

        body: {
          type: 'object',

          required: [
            'name',
            'email',
            'password',
          ],

          properties: {
            name: {
              type: 'string',

             
            },

            email: {
              type: 'string',

              format: 'email',

             
            },

            password: {
              type: 'string',

            },
          },
        },

        response: {
          201: {
            description:
              'Usuário criado com sucesso',

            type: 'object',

            properties: {
              user: {
                type: 'object',

                properties: {
                  id: {
                    type: 'string',
                  },

                  name: {
                    type: 'string',
                  },

                  email: {
                    type: 'string',
                  },
                },
              },
            },
          },

          400: {
            description:
              'Erro de validação',

            type: 'object',

            properties: {
              message: {
                type: 'string',

               
              },
            },
          },
        },
      },
    },

    authController.register
  )

  //
  // LOGIN
  //

  app.post(
    '/login',
    {
      schema: {
        tags: ['Auth'],

        summary:
          'Autentica usuário',

        description:
          'Realiza login e retorna token JWT',

        body: {
          type: 'object',

          required: [
            'email',
            'password',
          ],

          properties: {
            email: {
              type: 'string',

              format: 'email',

              
            },

            password: {
              type: 'string',

           
            },
          },
        },

        response: {
          200: {
            description:
              'Login realizado com sucesso',

            type: 'object',

            properties: {
              token: {
                type: 'string',

                
              },
            },
          },

          401: {
            description:
              'Credenciais inválidas',

            type: 'object',

            properties: {
              message: {
                type: 'string',

               
              },
            },
          },
        },
      },
    },

    authController.login
  )
}