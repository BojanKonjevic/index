import { Hono } from "hono"
import type { Bindings } from ".."
import { fetchFromR2 } from "../lib/s3"

const mimeTypes: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  avi: "video/x-msvideo",
}

function getMimeType(ext: string): string {
  return mimeTypes[ext.toLowerCase()] ?? "application/octet-stream"
}

const app = new Hono<{ Bindings: Bindings }>()

app.get("/file/:path", async (c) => {
  const path = c.req.param("path")

  const dotIndex = path.lastIndexOf(".")
  if (dotIndex === -1) return c.notFound()
  const ext = path.slice(dotIndex + 1)
  const contentType = getMimeType(ext)

  const object = await c.env.BUCKET.get(path)
  if (object) {
    const headers = new Headers()
    headers.set("Content-Type", contentType)
    headers.set("Cache-Control", "public, max-age=86400")
    headers.set("Access-Control-Allow-Origin", "*")
    return new Response(object.body, { headers })
  }

  const { R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ACCOUNT_ID } = c.env as unknown as Record<
    string,
    string
  >
  if (R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_ACCOUNT_ID) {
    const response = await fetchFromR2(
      R2_ACCOUNT_ID,
      R2_ACCESS_KEY_ID,
      R2_SECRET_ACCESS_KEY,
      "index-bucket",
      path,
      contentType,
    )
    if (response) return response
  }

  return c.notFound()
})

export default app
