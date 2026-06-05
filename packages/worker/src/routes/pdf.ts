import { Hono } from "hono"

const app = new Hono()

app.get("/pdf/:id", async (c) => {
  const id = c.req.param("id")
  const cacheKey = `https://cache/pdf/${id}`
  const cache = (caches as unknown as { default: Cache }).default

  const cached = await cache.match(cacheKey)
  if (cached) return cached

  const url = `https://drive.google.com/uc?export=download&id=${id}&confirm=t`
  const response = await fetch(url, { redirect: "follow" })

  const headers = new Headers(response.headers)
  headers.set("Access-Control-Allow-Origin", "*")
  headers.set("Access-Control-Allow-Methods", "GET, OPTIONS")
  headers.set("Cache-Control", "public, max-age=86400")

  const pdfData = await response.arrayBuffer()
  const cachedResponse = new Response(pdfData, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })

  c.executionCtx.waitUntil(cache.put(cacheKey, cachedResponse.clone()))
  return cachedResponse
})

export default app
