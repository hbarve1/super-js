import createFastify from "fastify"
import { attachLogger } from "./middleware/logger.js"
import { registerHealth } from "./routes/health.js"
import { registerUsers } from "./routes/users.js"

async function start(): Promise<void> {
  const app: dynamic = createFastify({ logger: false })

  attachLogger(app)
  registerHealth(app)
  registerUsers(app)

  await app.listen({ port: 3000, host: "127.0.0.1" })
  console.log("mvb-fastify listening on http://127.0.0.1:3000")
}

start()
