import { Hono } from "hono"
import { bodyLimit } from "hono/body-limit"
import subjects from "./routes/subjects"
import fileRoutes from "./routes/files"
import auth from "./routes/auth"
import user from "./routes/user"
import dashboard from "./routes/dashboard"
import { msg } from "./lib/i18n"
import { AppError } from "./lib/error"

export type Bindings = {
  ASSETS: Fetcher
  DB: D1Database
  BUCKET: R2Bucket
  SESSION_SECRET: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.use(bodyLimit({ maxSize: 1024 * 1024 }))

app.use("/api/*", async (c, next) => {
  await next()
  c.res.headers.set("Content-Security-Policy", "default-src 'none'")
})

app.onError((err, c) => {
  if (err instanceof AppError) {
    return c.json(
      { error: msg(c, err.message) },
      err.statusCode as 400 | 401 | 404 | 409 | 429 | 500,
    )
  }
  console.error("Unhandled error:", err instanceof Error ? err.message : String(err))
  return c.json({ error: msg(c, "error.internal") }, 500)
})

app.route("/api", subjects)
app.route("/api", fileRoutes)
app.route("/api", auth)
app.route("/api", user)
app.route("/api", dashboard)

app.get("/api/health", (c) => c.json({ status: "ok" }))

const SPA_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "media-src 'self' https://www.youtube-nocookie.com",
  "frame-src https://www.youtube-nocookie.com",
  "connect-src 'self'",
].join("; ")

app.all("*", async (c) => {
  const response = await c.env.ASSETS.fetch(c.req.raw)
  const headers = new Headers(response.headers)
  headers.set("Content-Security-Policy", SPA_CSP)
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
})

export default app
