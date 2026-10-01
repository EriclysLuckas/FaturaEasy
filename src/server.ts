import { app } from './app.js'
import { startScheduler } from './jobs/scheduler.js'

const PORT =
  Number(process.env.PORT) || 3333

startScheduler()

app.listen({
  port: PORT,
  host: '0.0.0.0',
}).then(() => {
  console.log(
    `Server running on http://localhost:${PORT}/health`
  )
})