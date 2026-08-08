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

function parseRangeHeader(header: string): R2Range | undefined {
  const suffixMatch = header.match(/^bytes=(\d+)-$/)
  if (suffixMatch) {
    return { offset: parseInt(suffixMatch[1], 10) }
  }
  const rangeMatch = header.match(/^bytes=(\d+)-(\d+)$/)
  if (rangeMatch) {
    const offset = parseInt(rangeMatch[1], 10)
    const end = parseInt(rangeMatch[2], 10)
    return { offset, length: end - offset + 1 }
  }
  const trailMatch = header.match(/^bytes=-(\d+)$/)
  if (trailMatch) {
    return { suffix: parseInt(trailMatch[1], 10) }
  }
}

const app = new Hono<{ Bindings: Bindings }>()

app.get("/file/*", async (c) => {
  const rawPath = c.req.path.replace(/^\/api\/file\//, "")

  const path = rawPath
    .split("/")
    .reduce<string[]>((acc, segment) => {
      if (segment === "..") acc.pop()
      else if (segment !== "." && segment !== "") acc.push(segment)
      return acc
    }, [])
    .join("/")

  const rangeHeader = c.req.header("Range")
  const range = rangeHeader ? parseRangeHeader(rangeHeader) : undefined

  const object = await c.env.BUCKET.get(path, range ? { range } : undefined)
  if (!object) return c.notFound()

  const dotIndex = path.lastIndexOf(".")
  if (dotIndex === -1) return c.notFound()
  const ext = path.slice(dotIndex + 1)
  const contentType = getMimeType(ext)

  const headers = new Headers()
  headers.set("Content-Type", contentType)
  headers.set("Cache-Control", "public, max-age=86400")
  headers.set("Access-Control-Allow-Origin", "*")
  headers.set("ETag", object.httpEtag)
  headers.set("Accept-Ranges", "bytes")
  if (object.uploaded) {
    headers.set("Last-Modified", object.uploaded.toUTCString())
  }
  return new Response(object.body, { status: range ? 206 : 200, headers })
})

export default app
