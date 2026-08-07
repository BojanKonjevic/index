import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { OfflineSubjectPayload } from "@index/shared"
import { getSubjectBundle, getSubjectBundles, removeSubjectBundle } from "@/lib/offline/db"
import { useOfflineDownloads } from "@/hooks/useOfflineDownloads"

class FakeCache implements Cache {
  private entries = new Map<string, Response>()

  async match(request: RequestInfo | URL): Promise<Response | undefined> {
    return this.entries.get(this.keyOf(request))
  }

  async matchAll(): Promise<Response[]> {
    return [...this.entries.values()]
  }

  async add(request: RequestInfo | URL): Promise<void> {
    void request
  }

  async addAll(requests: RequestInfo[]): Promise<void> {
    void requests
  }

  async put(request: RequestInfo | URL, response: Response): Promise<void> {
    this.entries.set(this.keyOf(request), response)
  }

  async delete(request: RequestInfo | URL): Promise<boolean> {
    return this.entries.delete(this.keyOf(request))
  }

  async keys(): Promise<Request[]> {
    return [...this.entries.keys()].map((url) => new Request(url))
  }

  private keyOf(request: RequestInfo | URL): string {
    return typeof request === "string"
      ? request
      : request instanceof Request
        ? request.url
        : request.href
  }
}

function makePayload(): OfflineSubjectPayload {
  return {
    revision: "1:2026-08-07T10:00:00Z",
    materialCount: 1,
    subject: {
      id: "ma2",
      name: "Matematička analiza 2",
      semester: 4,
      espb: 8,
      elective: false,
      electiveGroup: null,
      description: "Analiza",
      professors: [],
      assistants: [],
    },
    materials: [
      {
        id: "m1",
        subjectId: "ma2",
        title: "Vežbe 01",
        category: "problems",
        examPart: null,
        solved: null,
        fileType: "pdf",
        url: "/api/file/vezbe.pdf",
        tags: [],
        assets: [
          {
            id: "m1a1",
            materialId: "m1",
            pageNumber: 1,
            name: "strana 1",
            fileType: "image",
            url: "/api/file/vezbe-1.jpg",
          },
        ],
      },
    ],
    pages: [],
  }
}

describe("useOfflineDownloads", () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    for (const bundle of await getSubjectBundles()) {
      await removeSubjectBundle(bundle.subjectId)
    }
    vi.stubGlobal("caches", { open: async () => new FakeCache() })
    fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes("/offline/subject/")) {
        return new Response(JSON.stringify(makePayload()), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
      }
      return new Response("x", { status: 200, headers: { "content-length": "1" } })
    })
    vi.stubGlobal("fetch", fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("starts with no downloads and an empty job map", async () => {
    const { result } = renderHook(() => useOfflineDownloads())
    await waitFor(() => expect(result.current.downloaded).toEqual([]))
    expect(result.current.jobs).toEqual({})
    expect(result.current.isDownloaded("ma2")).toBe(false)
  })

  it("downloads a subject and reports it as downloaded", async () => {
    const { result } = renderHook(() => useOfflineDownloads())
    await act(async () => {
      await result.current.startDownload("ma2")
    })

    expect(result.current.jobs.ma2?.status).toBe("done")
    await waitFor(() => expect(result.current.isDownloaded("ma2")).toBe(true))
    expect((await getSubjectBundle("ma2"))?.status).toBe("complete")
  })

  it("reports progress while running", async () => {
    const pending: Array<() => void> = []
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes("/offline/subject/")) {
        return Promise.resolve(
          new Response(JSON.stringify(makePayload()), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
        )
      }
      return new Promise<Response>((resolve) => {
        pending.push(() =>
          resolve(new Response("x", { status: 200, headers: { "content-length": "1" } })),
        )
      })
    })

    const { result } = renderHook(() => useOfflineDownloads())
    let promise: Promise<void>
    await act(async () => {
      promise = result.current.startDownload("ma2")
      await Promise.resolve()
    })
    expect(result.current.jobs.ma2?.status).toBe("running")

    await act(async () => {
      await waitFor(() => expect(pending.length).toBe(2))
      for (const resolve of pending.splice(0)) resolve()
      await promise
    })
    expect(result.current.jobs.ma2?.status).toBe("done")
  })

  it("marks a cancelled download as cancelled and not downloaded", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.includes("/offline/subject/")) {
        return Promise.resolve(
          new Response(JSON.stringify(makePayload()), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
        )
      }
      return new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(new DOMException("The user aborted a request.", "AbortError")),
        )
      })
    })

    const { result } = renderHook(() => useOfflineDownloads())
    let promise: Promise<void>
    await act(async () => {
      promise = result.current.startDownload("ma2")
      await Promise.resolve()
    })
    expect(result.current.jobs.ma2?.status).toBe("running")

    await act(async () => {
      result.current.cancelDownload("ma2")
      await promise
    })

    expect(result.current.jobs.ma2?.status).toBe("cancelled")
    expect(result.current.isDownloaded("ma2")).toBe(false)
  })

  it("marks a failed download with the error message", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "Nepoznat predmet" }), { status: 404 }),
    )

    const { result } = renderHook(() => useOfflineDownloads())
    await act(async () => {
      await result.current.startDownload("ma2")
    })

    expect(result.current.jobs.ma2?.status).toBe("failed")
    expect(result.current.jobs.ma2?.error).toContain("Nepoznat predmet")
    expect(result.current.isDownloaded("ma2")).toBe(false)
  })

  it("removes the subject and its offline data", async () => {
    const { result } = renderHook(() => useOfflineDownloads())
    await act(async () => {
      await result.current.startDownload("ma2")
    })
    await waitFor(() => expect(result.current.isDownloaded("ma2")).toBe(true))

    await act(async () => {
      await result.current.removeOffline("ma2")
    })

    expect(await getSubjectBundle("ma2")).toBeNull()
    await waitFor(() => expect(result.current.isDownloaded("ma2")).toBe(false))
  })
})
