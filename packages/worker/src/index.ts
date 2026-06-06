import { Hono } from "hono"
import subjects from "./routes/subjects"
import pdf from "./routes/pdf"
import auth from "./routes/auth"
import user from "./routes/user"

export type Bindings = {
  ASSETS: Fetcher
  DB: D1Database
  BUCKET: R2Bucket
  SESSION_SECRET: string
  R2_ACCESS_KEY_ID?: string
  R2_SECRET_ACCESS_KEY?: string
  R2_ACCOUNT_ID?: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.onError((err, c) => {
  console.error(err)
  return c.json({ error: "Internal server error" }, 500)
})

app.route("/api", subjects)
app.route("/api", pdf)
app.route("/api", auth)
app.route("/api", user)

app.get("/api/health", (c) => c.json({ status: "ok" }))

app.all("*", async (c) => {
  return c.env.ASSETS.fetch(c.req.raw)
})

export default app
