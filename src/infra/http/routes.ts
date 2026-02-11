// Registro de rotas
import { FastifyInstance } from "fastify";
import { authRoutes } from "../../modules/auth/auth.routes.js";

export async function routes(app: FastifyInstance) {
  app.get("/health", async () => ({ status: "ok" }));

  app.register(authRoutes, { prefix: "/auth" });
}
