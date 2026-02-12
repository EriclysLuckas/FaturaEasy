import Fastify from "fastify";
import cors from "@fastify/cors";

import { healthRoutes } from "./routes/health.routes.js";

export const app = Fastify({
  logger: true,
});

app.register(cors);

app.register(healthRoutes);