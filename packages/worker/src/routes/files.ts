import { Hono } from "hono"
import type { Bindings } from ".."

const mimeTypes: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  mp4: "video/mp4",
  webm: "video/webm",
  txt: "text/plain; charset=utf-8",
  sql: "text/plain; charset=utf-8",
  text: "text/plain; charset=utf-8",
  html: "text/html; charset=utf-8",
  py: "text/plain; charset=utf-8",
  csv: "text/plain; charset=utf-8",
  tsv: "text/plain; charset=utf-8",
  md: "text/markdown; charset=utf-8",
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

  const dotIndex = path.lastIndexOf(".")
  if (dotIndex === -1) return c.notFound()
  const ext = path.slice(dotIndex + 1)
  const contentType = getMimeType(ext)

  const rangeHeader = c.req.header("Range")
  const range = rangeHeader ? parseRangeHeader(rangeHeader) : undefined

  const object = await c.env.BUCKET.get(path, range ? { range } : undefined)
  if (!object) return c.notFound()

  // Files are content-addressed by the client caches under their URL, so a
  // rewrite must surface on the very next load: no-cache forces a
  // conditional request every time, and the 304 below keeps that cheap
  // (empty body) instead of re-downloading multi-megabyte PDFs.
  const etag = object.httpEtag
  // A 304 carries the validators a cache needs for its next round; the
  // stored entry keeps its representation headers from the 200.
  const notModifiedHeaders: Record<string, string> = {
    ETag: etag,
    "Cache-Control": "public, no-cache",
  }
  if (object.uploaded) {
    notModifiedHeaders["Last-Modified"] = object.uploaded.toUTCString()
  }
  const ifNoneMatch = c.req.header("If-None-Match")
  if (
    ifNoneMatch &&
    (ifNoneMatch.trim() === "*" || ifNoneMatch.split(",").some((t) => t.trim() === etag))
  ) {
    return new Response(null, { status: 304, headers: notModifiedHeaders })
  }
  const ifModifiedSince = c.req.header("If-Modified-Since")
  if (ifModifiedSince && object.uploaded) {
    const since = Date.parse(ifModifiedSince)
    if (
      !Number.isNaN(since) &&
      Math.floor(object.uploaded.getTime() / 1000) <= Math.floor(since / 1000)
    ) {
      return new Response(null, { status: 304, headers: notModifiedHeaders })
    }
  }

  const headers = new Headers()
  headers.set("Content-Type", contentType)
  headers.set("Cache-Control", "public, no-cache")
  headers.set("Access-Control-Allow-Origin", "*")
  headers.set("ETag", object.httpEtag)
  headers.set("Accept-Ranges", "bytes")
  if (ext.toLowerCase() === "html") {
    // Stored HTML (notebooks, slides) is a document, not a download: it
    // needs its images, inline styles, and CDN scripts (MathJax). R2 serves
    // these responses with a blanket `default-src 'none'`, so state an
    // explicit policy. Scripts run, but the app embeds these pages in a
    // sandboxed iframe without same-origin access, so page JS cannot touch
    // app storage. Keep it tight: no object/embed, no base-uri changes.
    headers.set(
      "Content-Security-Policy",
      "default-src 'self' data: blob: https:; " +
        "script-src 'self' https: 'unsafe-inline'; " +
        "style-src 'self' https: 'unsafe-inline'; " +
        "img-src 'self' data: https:; " +
        "font-src 'self' data: https:; " +
        "connect-src 'self' https:; " +
        "object-src 'none'; base-uri 'self'",
    )
  }
  if (object.uploaded) {
    headers.set("Last-Modified", object.uploaded.toUTCString())
  }
  return new Response(object.body, { status: range ? 206 : 200, headers })
})

export default app
