import { describe, it, expect, beforeAll } from "vitest"
import { exports, env } from "cloudflare:workers"
import { runMigrations } from "./helpers"

type Worker = {
  fetch: (url: string | Request, init?: RequestInit) => Promise<Response>
}
const SELF = (exports as unknown as { default: Worker }).default
const BUCKET = (env as unknown as { BUCKET: R2Bucket }).BUCKET

const BODY = "PDFDATA-0123456789"

describe("GET /api/file/*", () => {
  beforeAll(async () => {
    await runMigrations()
    await BUCKET.put("ma2/dir/file.pdf", BODY)
    await BUCKET.put("ma2/dir/image.jpg", BODY)
  })

  it("serves a stored object with the content type from its extension", async () => {
    const res = await SELF.fetch("http://localhost/api/file/ma2/dir/file.pdf")
    expect(res.status).toBe(200)
    expect(res.headers.get("Content-Type")).toBe("application/pdf")
    expect(res.headers.get("Accept-Ranges")).toBe("bytes")
    expect(res.headers.get("ETag")).toBeTruthy()
    expect(await res.text()).toBe(BODY)
  })

  it("maps jpg extensions to image/jpeg", async () => {
    const res = await SELF.fetch("http://localhost/api/file/ma2/dir/image.jpg")
    expect(res.headers.get("Content-Type")).toBe("image/jpeg")
  })

  it("returns 404 for a missing object", async () => {
    const res = await SELF.fetch("http://localhost/api/file/ma2/dir/missing.pdf")
    expect(res.status).toBe(404)
  })

  it("returns 404 for a path without an extension", async () => {
    const res = await SELF.fetch("http://localhost/api/file/ma2/dir/file")
    expect(res.status).toBe(404)
  })

  it("handles an open-ended byte range", async () => {
    const res = await SELF.fetch("http://localhost/api/file/ma2/dir/file.pdf", {
      headers: { Range: "bytes=4-" },
    })
    expect(res.status).toBe(206)
    expect(await res.text()).toBe("ATA-0123456789")
  })

  it("handles a closed byte range", async () => {
    const res = await SELF.fetch("http://localhost/api/file/ma2/dir/file.pdf", {
      headers: { Range: "bytes=0-3" },
    })
    expect(res.status).toBe(206)
    expect(await res.text()).toBe("PDFD")
  })

  it("handles a suffix range", async () => {
    const res = await SELF.fetch("http://localhost/api/file/ma2/dir/file.pdf", {
      headers: { Range: "bytes=-4" },
    })
    expect(res.status).toBe(206)
    expect(await res.text()).toBe("6789")
  })

  it("echoes the origin for CORS when present", async () => {
    const res = await SELF.fetch("http://localhost/api/file/ma2/dir/file.pdf", {
      headers: { Origin: "https://example.com" },
    })
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://example.com")
    expect(res.headers.get("Vary")).toBe("Origin")
  })

  it("returns * for CORS when no origin is sent", async () => {
    const res = await SELF.fetch("http://localhost/api/file/ma2/dir/file.pdf")
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*")
  })

  it("does not serve bucket content on traversal attempts", async () => {
    const res = await SELF.fetch("http://localhost/api/file/%2e%2e/x.pdf")
    expect(await res.text()).not.toContain(BODY)
  })

  it("does not serve bucket keys outside the requested path", async () => {
    const res = await SELF.fetch("http://localhost/api/file/ma2/dir/../../dir/file.pdf")
    expect([200, 404]).toContain(res.status)
    expect(await res.text()).not.toContain(BODY)
  })
})
