import { app } from "./app.js";

const PORT = Number(process.env.PORT) || 3333;

app.listen({ port: PORT }).then(() => {
  console.log(`🚀 Server running on http://localhost:${PORT}/health`);
});
