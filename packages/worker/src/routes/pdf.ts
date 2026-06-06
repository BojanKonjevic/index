import { Hono } from "hono"
import type { Bindings } from ".."
import { fetchFromR2 } from "../lib/s3"

const app = new Hono<{ Bindings: Bindings }>()

app.get("/pdf/:id", async (c) => {
  const id = c.req.param("id")
  const key = `${id}.pdf`

  const object = await c.env.BUCKET.get(key)
  if (object) {
    const headers = new Headers()
    headers.set("Content-Type", "application/pdf")
    headers.set("Cache-Control", "public, max-age=86400")
    headers.set("Access-Control-Allow-Origin", "*")
    return new Response(object.body, { headers })
  }

  const { R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ACCOUNT_ID } = c.env as Record<string, string>
  if (R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_ACCOUNT_ID) {
    const response = await fetchFromR2(
      R2_ACCOUNT_ID,
      R2_ACCESS_KEY_ID,
      R2_SECRET_ACCESS_KEY,
      "index-bucket",
      key,
    )
    if (response) return response
  }

  return c.notFound()
})

export default app
