import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',

    include: ['tests/integration/**/*.spec.ts'],
    exclude: ['node_modules/**', 'dist/**'],

    // Integração usa o Postgres de teste real (docker-compose, .env.test) —
    // roda os arquivos em série pra evitar duas suítes disputando o mesmo
    // banco (e o TRUNCATE de uma não apagar dado que a outra está usando).
    fileParallelism: false,

    // migrate deploy + chamadas HTTP reais são mais lentas que um teste unitário.
    testTimeout: 30_000,
    hookTimeout: 30_000,

    // Aqui NÃO usamos clearMocks/restoreMocks/mockReset (isso é do vitest.config.ts
    // unitário) — não há mocks nos testes de integração, é tudo real.
  },
})