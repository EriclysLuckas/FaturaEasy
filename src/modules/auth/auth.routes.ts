import { FastifyInstance } from "fastify";
import { AuthController } from "./auth.controller.js";

export async function authRoutes(app: FastifyInstance) {
  const controller = new AuthController();

  app.post("/register", controller.register.bind(controller));
  app.post("/login", controller.login.bind(controller));
}
