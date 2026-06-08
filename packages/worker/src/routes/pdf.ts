import { Hono } from "hono"
import type { Bindings } from ".."

const mimeTypes: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  mp4: "video/mp4",
  webm: "video/webm",
}

function getMimeType(ext: string): string {
  return mimeTypes[ext.toLowerCase()] ?? "application/octet-stream"
}

const app = new Hono<{ Bindings: Bindings }>()

app.get("/file/*", async (c) => {
  const path = c.req.path.replace(/^\/api\/file\//, "")

  const object = await c.env.BUCKET.get(path)
  if (!object) return c.notFound()

  const dotIndex = path.lastIndexOf(".")
  if (dotIndex === -1) return c.notFound()
  const ext = path.slice(dotIndex + 1)
  const contentType = getMimeType(ext)

  const headers = new Headers()
  headers.set("Content-Type", contentType)
  headers.set("Cache-Control", "public, max-age=86400")
  headers.set("Access-Control-Allow-Origin", "*")
  return new Response(object.body, { headers })
})

export default app
