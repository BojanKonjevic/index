import { Hono } from "hono"
import subjects from "./routes/subjects"
import fileRoutes from "./routes/pdf"
import auth from "./routes/auth"
import user from "./routes/user"
import dashboard from "./routes/dashboard"
import { msg } from "./lib/i18n"

export type Bindings = {
  ASSETS: Fetcher
  DB: D1Database
  BUCKET: R2Bucket
  SESSION_SECRET: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.onError((err, c) => {
  console.error(err)
  return c.json({ error: msg(c, "error.internal") }, 500)
})

app.route("/api", subjects)
app.route("/api", fileRoutes)
app.route("/api", auth)
app.route("/api", user)
app.route("/api", dashboard)

app.get("/api/health", (c) => c.json({ status: "ok" }))

app.all("*", async (c) => {
  return c.env.ASSETS.fetch(c.req.raw)
})

export default app
