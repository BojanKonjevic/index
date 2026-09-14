import { describe, it, expect, beforeEach, vi } from "vitest"
import { fileStrategyHandler } from "../fileRangeHandler"

// Exercises the exact function serialized into sw.js, with stubbed service
// worker globals. Guards the production failure where Workbox's
// RangeRequestsPlugin was inlined without its `createPartialResponse`
// binding, so every ranged PDF read threw ReferenceError.

const BYTES = new Uint8Array(1000).map((_, i) => i % 256)

function fullResponse(): Response {
  return new Response(BYTES.slice().buffer as ArrayBuffer, {
    status: 200,
    headers: { "content-type": "application/pdf", "content-length": "1000" },
  })
}

describe("fileStrategyHandler", () => {
  const store = new Map<string, Response>()

  beforeEach(() => {
    store.clear()
    ;(globalThis as unknown as { caches: unknown }).caches = {
      open: async () => ({
        match: async (req: Request) => store.get(req.url)?.clone(),
        put: async (req: Request, res: Response) => {
          store.set(req.url, res.clone())
        },
      }),
    }
    vi.stubGlobal("fetch", async () => fullResponse())
  })

  it("serves a full 200 on cache miss and stores it", async () => {
    const res = await fileStrategyHandler({ request: new Request("https://x/f.pdf") })
    expect(res.status).toBe(200)
    expect((await res.arrayBuffer()).byteLength).toBe(1000)
    expect(store.has("https://x/f.pdf")).toBe(true)
  })

  it("slices byte ranges as 206 with Content-Range", async () => {
    const res = await fileStrategyHandler({
      request: new Request("https://x/f.pdf", { headers: { range: "bytes=0-99" } }),
    })
    expect(res.status).toBe(206)
    expect(res.headers.get("content-range")).toBe("bytes 0-99/1000")
    const body = new Uint8Array(await res.arrayBuffer())
    expect(body.length).toBe(100)
    expect(body[0]).toBe(BYTES[0])
    expect(body[99]).toBe(BYTES[99])
  })

  it("handles open-ended and suffix ranges", async () => {
    const open = await fileStrategyHandler({
      request: new Request("https://x/f.pdf", { headers: { range: "bytes=900-" } }),
    })
    expect(open.status).toBe(206)
    expect(open.headers.get("content-range")).toBe("bytes 900-999/1000")

    const suffix = await fileStrategyHandler({
      request: new Request("https://x/f.pdf", { headers: { range: "bytes=-10" } }),
    })
    expect(suffix.status).toBe(206)
    expect(suffix.headers.get("content-range")).toBe("bytes 990-999/1000")
  })

  it("rejects invalid ranges with 416", async () => {
    const res = await fileStrategyHandler({
      request: new Request("https://x/f.pdf", { headers: { range: "bytes=9999-99999" } }),
    })
    expect(res.status).toBe(416)
    expect(res.headers.get("content-range")).toBe("bytes */1000")
  })

  it("refetches poisoned non-200 cache entries instead of serving them", async () => {
    // The old plugin path could store a 206 partial under the file URL.
    store.set(
      "https://x/f.pdf",
      new Response(BYTES.slice(0, 100).buffer as ArrayBuffer, { status: 206 }),
    )
    const res = await fileStrategyHandler({ request: new Request("https://x/f.pdf") })
    expect(res.status).toBe(200)
    expect((await res.arrayBuffer()).byteLength).toBe(1000)
  })

  it("throws when the network fails with nothing usable cached", async () => {
    vi.stubGlobal("fetch", async () => new Response(null, { status: 500 }))
    await expect(fileStrategyHandler({ request: new Request("https://x/f.pdf") })).rejects.toThrow()
  })
})
