import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { SearchAbortedError, SearchSequenceGuard, searchContent } from "@/lib/api"
import type { SearchContentResponse } from "@index/shared"

const okBody: SearchContentResponse = {
  content: { total: 1, hasMore: false, items: [] },
}

function mockFetch(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  const fn = vi.fn().mockResolvedValue({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: () => Promise.resolve(body),
  })
  vi.stubGlobal("fetch", fn)
  return fn
}

describe("searchContent", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("sends the query and global scope", async () => {
    const fn = mockFetch(okBody)
    await searchContent({ q: "loran", scope: "global" })
    expect(fn).toHaveBeenCalledTimes(1)
    const [url] = fn.mock.calls[0]
    expect(String(url)).toContain("/api/search?")
    expect(String(url)).toContain("q=loran")
    expect(String(url)).toContain("scope=global")
    expect(String(url)).toContain("limit=20")
    expect(String(url)).toContain("offset=0")
  })

  it("sends subject scope with its full parameter set", async () => {
    const fn = mockFetch(okBody)
    await searchContent({
      q: "rešenje",
      scope: "subject",
      subjectId: "matematicka-analiza-2",
      includeOcr: true,
      limit: 5,
      offset: 10,
    })
    const [url] = fn.mock.calls[0]
    expect(String(url)).toContain("scope=subject")
    expect(String(url)).toContain("subjectId=matematicka-analiza-2")
    expect(String(url)).toContain("includeOcr=1")
    expect(String(url)).toContain("limit=5")
    expect(String(url)).toContain("offset=10")
  })

  it("sends material scope with materialId", async () => {
    const fn = mockFetch(okBody)
    await searchContent({ q: "loran", scope: "material", materialId: "ma2-vezbe-12" })
    const [url] = fn.mock.calls[0]
    expect(String(url)).toContain("scope=material")
    expect(String(url)).toContain("materialId=ma2-vezbe-12")
  })

  it("passes the abort signal through to fetch", async () => {
    const fn = mockFetch(okBody)
    const controller = new AbortController()
    await searchContent({ q: "loran", scope: "global" }, controller.signal)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn.mock.calls[0][1].signal).toBe(controller.signal)
  })

  it("rejects with SearchAbortedError without fetching when already aborted", async () => {
    const fn = mockFetch(okBody)
    const controller = new AbortController()
    controller.abort()
    await expect(
      searchContent({ q: "loran", scope: "global" }, controller.signal),
    ).rejects.toBeInstanceOf(SearchAbortedError)
    expect(fn).not.toHaveBeenCalled()
  })

  it("rejects with SearchAbortedError when aborted mid-flight", async () => {
    const controller = new AbortController()
    const fn = vi.fn().mockImplementation((_url, init) => {
      return new Promise((_resolve, reject) => {
        init.signal.addEventListener("abort", () => {
          reject(new DOMException("The operation was aborted", "AbortError"))
        })
      })
    })
    vi.stubGlobal("fetch", fn)

    const promise = searchContent({ q: "loran", scope: "global" }, controller.signal)
    controller.abort()
    await expect(promise).rejects.toBeInstanceOf(SearchAbortedError)
  })

  it("normalizes an abort rejection to SearchAbortedError even without a signal check", async () => {
    const fn = mockFetch(new Error("boom"), { ok: false })
    fn.mockImplementation(() => {
      throw new DOMException("The operation was aborted", "AbortError")
    })
    await expect(searchContent({ q: "loran", scope: "global" })).rejects.toBeInstanceOf(
      SearchAbortedError,
    )
  })

  it("throws ApiError on non-ok responses", async () => {
    mockFetch({ error: "nope" }, { ok: false, status: 500 })
    await expect(searchContent({ q: "loran", scope: "global" })).rejects.toMatchObject({
      name: "ApiError",
      status: 500,
      body: { error: "nope" },
    })
  })

  it("resolves with the typed response body", async () => {
    mockFetch(okBody)
    await expect(searchContent({ q: "loran", scope: "global" })).resolves.toEqual(okBody)
  })

  it("propagates non-abort network failures as-is", async () => {
    const fn = mockFetch(new Error("nope"), { ok: false })
    fn.mockRejectedValueOnce(new TypeError("fetch failed"))
    await expect(searchContent({ q: "loran", scope: "global" })).rejects.toBeInstanceOf(TypeError)
  })
})

describe("SearchSequenceGuard", () => {
  it("issues monotonically increasing sequence numbers", () => {
    const guard = new SearchSequenceGuard()
    expect(guard.beginRequest()).toBe(1)
    expect(guard.beginRequest()).toBe(2)
    expect(guard.beginRequest()).toBe(3)
  })

  it("applies in-order responses", () => {
    const guard = new SearchSequenceGuard()
    expect(guard.shouldApply(1)).toBe(true)
    expect(guard.shouldApply(2)).toBe(true)
  })

  it("drops a stale response that lands after a newer one was applied", () => {
    const guard = new SearchSequenceGuard()
    expect(guard.shouldApply(2)).toBe(true)
    expect(guard.shouldApply(1)).toBe(false)
    expect(guard.shouldApply(0)).toBe(false)
  })

  it("accepts a newer response after an older stale one was dropped", () => {
    const guard = new SearchSequenceGuard()
    expect(guard.shouldApply(3)).toBe(true)
    expect(guard.shouldApply(2)).toBe(false)
    expect(guard.shouldApply(4)).toBe(true)
  })
})
