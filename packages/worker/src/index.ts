import { Hono } from "hono"
import subjects from "./routes/subjects"
import pdf from "./routes/pdf"

export type Bindings = {
  ASSETS: Fetcher
}

const app = new Hono<{ Bindings: Bindings }>()

app.route("/api", subjects)
app.route("/api", pdf)

app.get("/api/health", (c) => c.json({ status: "ok" }))

app.all("*", async (c) => {
  return c.env.ASSETS.fetch(c.req.raw)
})

export default app
