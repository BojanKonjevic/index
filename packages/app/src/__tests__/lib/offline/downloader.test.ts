import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { OfflineSubjectPayload } from "@index/shared"
import { getSubjectBundle, getSubjectBundles, removeSubjectBundle } from "@/lib/offline/db"
import {
  downloadSubjectOffline,
  offlineFileUrls,
  removeSubjectOffline,
} from "@/lib/offline/downloader"

class FakeCache implements Cache {
  private entries = new Map<string, Response>()

  async match(request: RequestInfo | URL): Promise<Response | undefined> {
    const key = this.keyOf(request)
    return this.entries.get(key)
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

  entriesForTest(): string[] {
    return [...this.entries.keys()]
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
    revision: "2:2026-08-07T10:00:00Z",
    materialCount: 2,
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
          {
            id: "m1a2",
            materialId: "m1",
            pageNumber: 2,
            name: "strana 2",
            fileType: "image",
            url: "/api/file/vezbe-2.jpg",
          },
        ],
      },
      {
        id: "m2",
        subjectId: "ma2",
        title: "Vežbe 02",
        category: "problems",
        examPart: null,
        solved: null,
        fileType: "pdf",
        url: "/api/file/vezbe.pdf",
        tags: [],
        assets: [
          {
            id: "m2a1",
            materialId: "m2",
            pageNumber: 1,
            name: "strana 1",
            fileType: "image",
            url: "/api/file/vezbe-3.jpg",
          },
          {
            id: "m2a2",
            materialId: "m2",
            pageNumber: 2,
            name: "strana 2",
            fileType: "image",
            url: "/api/file/vezbe-4.jpg",
          },
        ],
      },
    ],
    pages: [{ materialId: "m1", pageNumber: 1, text: "Prvi red" }],
  }
}

const FILE_BODIES: Record<string, string> = {
  "/api/file/vezbe.pdf": "a".repeat(100),
  "/api/file/vezbe-1.jpg": "b".repeat(200),
  "/api/file/vezbe-2.jpg": "c".repeat(300),
  "/api/file/vezbe-3.jpg": "d".repeat(400),
  "/api/file/vezbe-4.jpg": "e".repeat(500),
}

const ABS_BASE = "http://localhost:3000"

function fileResponse(url: string): Response {
  const body = FILE_BODIES[url] ?? "x"
  return new Response(body, {
    status: 200,
    headers: { "content-length": String(body.length) },
  })
}

function jsonResponse(payload: OfflineSubjectPayload): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "content-type": "application/json" },
  })
}

describe("offline downloader", () => {
  let cache: FakeCache
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    for (const bundle of await getSubjectBundles()) {
      await removeSubjectBundle(bundle.subjectId)
    }
    cache = new FakeCache()
    vi.stubGlobal("caches", { open: async () => cache })
    fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes("/offline/subject/")) return jsonResponse(makePayload())
      return fileResponse(new URL(url).pathname)
    })
    vi.stubGlobal("fetch", fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("downloads every file once with bounded concurrency and saves a complete bundle", async () => {
    const payload = makePayload()
    const urls = offlineFileUrls(payload)
    expect(urls).toHaveLength(5)

    let active = 0
    let maxActive = 0
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes("/offline/subject/")) return jsonResponse(payload)
      active++
      maxActive = Math.max(maxActive, active)
      await Promise.resolve()
      active--
      return fileResponse(new URL(url).pathname)
    })

    const progress: Array<{ filesDone: number; filesTotal: number; bytesTotal: number | null }> = []
    await downloadSubjectOffline("ma2", (p) => progress.push(p), new AbortController().signal)

    const filePaths = Object.keys(FILE_BODIES)
    for (const path of filePaths) {
      expect(cache.entriesForTest()).toContain(`${ABS_BASE}${path}`)
    }
    expect(maxActive).toBeLessThanOrEqual(4)

    const last = progress[progress.length - 1]
    expect(last.filesDone).toBe(5)
    expect(last.filesTotal).toBe(5)
    expect(last.bytesTotal).toBe(1500)

    const record = await getSubjectBundle("ma2")
    expect(record?.status).toBe("complete")
    expect(record?.revision).toBe(payload.revision)
  })

  it("skips already-cached files when resuming", async () => {
    await cache.put(`${ABS_BASE}/api/file/vezbe.pdf`, fileResponse("/api/file/vezbe.pdf"))
    await cache.put(`${ABS_BASE}/api/file/vezbe-1.jpg`, fileResponse("/api/file/vezbe-1.jpg"))

    await downloadSubjectOffline("ma2", () => {}, new AbortController().signal)

    const downloaded = fetchMock.mock.calls
      .map(([input]) => new URL(String(input), ABS_BASE).pathname)
      .filter((path) => path.startsWith("/api/file/"))
    expect(downloaded.sort()).toEqual([
      "/api/file/vezbe-2.jpg",
      "/api/file/vezbe-3.jpg",
      "/api/file/vezbe-4.jpg",
    ])
    const record = await getSubjectBundle("ma2")
    expect(record?.status).toBe("complete")
  })

  it("aborts mid-download, leaves an incomplete bundle and partial cache, and resumes", async () => {
    const controller = new AbortController()

    const promise = downloadSubjectOffline(
      "ma2",
      (p) => {
        if (p.filesDone === 1) controller.abort()
      },
      controller.signal,
    )

    await expect(promise).rejects.toMatchObject({ name: "AbortError" })

    const record = await getSubjectBundle("ma2")
    expect(record?.status).toBe("incomplete")
    expect(cache.entriesForTest().length).toBeGreaterThanOrEqual(1)

    await downloadSubjectOffline("ma2", () => {}, new AbortController().signal)
    const record2 = await getSubjectBundle("ma2")
    expect(record2?.status).toBe("complete")
    expect(cache.entriesForTest()).toHaveLength(5)
  })

  it("reports a failed file download and marks the bundle incomplete", async () => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes("/offline/subject/")) return jsonResponse(makePayload())
      const path = new URL(url).pathname
      if (path === "/api/file/vezbe-2.jpg") {
        return new Response("not found", { status: 404 })
      }
      return fileResponse(path)
    })

    await expect(
      downloadSubjectOffline("ma2", () => {}, new AbortController().signal),
    ).rejects.toThrow(/HTTP 404/)

    const record = await getSubjectBundle("ma2")
    expect(record?.status).toBe("incomplete")
  })

  it("prunes cached files that are no longer part of the subject", async () => {
    const payload = makePayload()
    await cache.put(`${ABS_BASE}/api/file/vezbe.pdf`, fileResponse("/api/file/vezbe.pdf"))
    await cache.put(`${ABS_BASE}/api/file/removed-exam.pdf`, new Response("stale", { status: 200 }))

    await downloadSubjectOffline("ma2", () => {}, new AbortController().signal)

    expect(cache.entriesForTest()).not.toContain(`${ABS_BASE}/api/file/removed-exam.pdf`)
    expect(cache.entriesForTest()).toContain(`${ABS_BASE}/api/file/vezbe.pdf`)
    void payload
  })

  it("fails when the export bundle cannot be fetched", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "Nepoznat predmet" }), { status: 404 }),
    )

    await expect(
      downloadSubjectOffline("ma2", () => {}, new AbortController().signal),
    ).rejects.toThrow(/Nepoznat predmet/)
    expect(await getSubjectBundle("ma2")).toBeNull()
  })

  it("removes the bundle and only that subject's cached files", async () => {
    const riPayload = makePayload()
    riPayload.subject.id = "ri"
    riPayload.subject.name = "Računarska inteligencija"
    riPayload.materials = riPayload.materials.map((m) => ({
      ...m,
      subjectId: "ri",
      url: m.url.replace("/api/file/vezbe.pdf", "/api/file/ri-vezbe.pdf"),
      assets: m.assets.map((a) => ({
        ...a,
        materialId: m.id,
        url: a.url.replace("/api/file/vezbe-", "/api/file/ri-vezbe-"),
      })),
    }))
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes("/offline/subject/")) {
        return jsonResponse(url.includes("/ri") ? riPayload : makePayload())
      }
      return fileResponse(new URL(url).pathname)
    })

    await downloadSubjectOffline("ma2", () => {}, new AbortController().signal)
    await downloadSubjectOffline("ri", () => {}, new AbortController().signal)

    await removeSubjectOffline("ma2")

    expect(await getSubjectBundle("ma2")).toBeNull()
    expect(await getSubjectBundle("ri")).not.toBeNull()
    expect(cache.entriesForTest()).not.toContain(`${ABS_BASE}/api/file/vezbe.pdf`)
    expect(cache.entriesForTest()).not.toContain(`${ABS_BASE}/api/file/vezbe-1.jpg`)
    expect(cache.entriesForTest()).toContain(`${ABS_BASE}/api/file/ri-vezbe.pdf`)
  })

  it("removing a subject that was never downloaded is a no-op", async () => {
    await expect(removeSubjectOffline("missing")).resolves.toBeUndefined()
  })
})
