import { FastifyReply, FastifyRequest } from "fastify";
import { AuthService } from "./auth.services.js";
import { loginSchema, registerSchema } from "./auth.schema.js";

export class AuthController {
  private authService = new AuthService();

  async register(request: FastifyRequest, reply: FastifyReply) {
    const data = registerSchema.parse(request.body);
    const user = await this.authService.register(
      data.name,
      data.email,
      data.password
    );

    return reply.status(201).send(user);
  }

  async login(request: FastifyRequest, reply: FastifyReply) {
    const data = loginSchema.parse(request.body);
    const result = await this.authService.login(data.email, data.password);

    return reply.send(result);
  }
}
