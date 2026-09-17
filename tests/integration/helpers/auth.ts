import type { FastifyInstance } from 'fastify'

export interface TestUser {
  id: string
  email: string
  token: string
}

/**
 * Registra e loga um usuário de teste usando os endpoints HTTP reais
 * (/register e /login), em vez de inserir direto no banco — assim essa
 * etapa também exercita o fluxo de autenticação de verdade.
 *
 * ⚠️ Assunções (ajuste se o schema real for diferente):
 * - POST /register espera { name, email, password }  (mapeia 1:1 com o model User)
 * - POST /login espera { email, password }
 * - A resposta de /login traz o token em `data.token` (mesmo padrão
 *   { success, data } visto no PaymentController). Também tento `token` e
 *   `accessToken` como fallback, caso o formato real seja outro.
 */
export async function registerAndLogin(
  app: FastifyInstance,
  overrides: { name?: string; email?: string; password?: string } = {}
): Promise<TestUser> {
  const email =
    overrides.email ??
    `user-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`
  const password = overrides.password ?? 'Password123!'
  const name = overrides.name ?? 'Test User'

  const registerResponse = await app.inject({
    method: 'POST',
    url: '/register',
    payload: { name, email, password },
  })

  if (registerResponse.statusCode >= 400) {
    throw new Error(
      `Falha ao registrar usuário de teste (${registerResponse.statusCode}): ${registerResponse.body}`
    )
  }

  const loginResponse = await app.inject({
    method: 'POST',
    url: '/login',
    payload: { email, password },
  })

  if (loginResponse.statusCode >= 400) {
    throw new Error(
      `Falha ao logar usuário de teste (${loginResponse.statusCode}): ${loginResponse.body}`
    )
  }

  const loginBody = loginResponse.json()
  const token =
    loginBody?.data?.token ??
    loginBody?.token ??
    loginBody?.data?.accessToken ??
    loginBody?.accessToken

  if (!token) {
    throw new Error(
      `Não foi possível extrair o token JWT da resposta de /login. Corpo recebido: ${loginResponse.body}`
    )
  }

  const registerBody = registerResponse.json()
  const userId = registerBody?.data?.id ?? registerBody?.id

  if (!userId) {
    throw new Error(
      `Não foi possível extrair o id do usuário da resposta de /register. Corpo recebido: ${registerResponse.body}`
    )
  }

  return { id: userId, email, token }
}

export function authHeader(token: string) {
  return { authorization: `Bearer ${token}` }
}