import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { OfflineSubjectPayload } from "@index/shared"
import {
  closeOfflineDb,
  getSubjectBundle,
  getSubjectBundles,
  isOfflineSubjectDownloaded,
  removeSubjectBundle,
  saveSubjectBundle,
} from "@/lib/offline/db"

function makePayload(overrides: Partial<OfflineSubjectPayload> = {}): OfflineSubjectPayload {
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
      professors: ["Prof"],
      assistants: [],
    },
    materials: [
      {
        id: "ma2-zbirka",
        subjectId: "ma2",
        title: "Zbirka",
        category: "problems",
        examPart: null,
        solved: null,
        fileType: "pdf",
        url: "/api/file/zbirka.pdf",
        tags: [],
        assets: [],
      },
    ],
    pages: [{ materialId: "ma2-zbirka", pageNumber: 1, text: "Prvi red" }],
    ...overrides,
  }
}

describe("offline db", () => {
  beforeEach(async () => {
    closeOfflineDb()
    for (const bundle of await getSubjectBundles()) {
      await removeSubjectBundle(bundle.subjectId)
    }
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("saves and reads back a subject bundle", async () => {
    const payload = makePayload()
    await saveSubjectBundle("ma2", payload, 12345)

    const record = await getSubjectBundle("ma2")
    expect(record).not.toBeNull()
    expect(record!.subjectId).toBe("ma2")
    expect(record!.revision).toBe("2:2026-08-07T10:00:00Z")
    expect(record!.materialCount).toBe(2)
    expect(record!.downloadedAt).toBe(12345)
    expect(record!.payload).toEqual(payload)
  })

  it("defaults downloadedAt to the current time", async () => {
    await saveSubjectBundle("ma2", makePayload())
    const record = await getSubjectBundle("ma2")
    expect(record!.downloadedAt).toBeGreaterThan(0)
  })

  it("returns null for a subject that was never saved", async () => {
    expect(await getSubjectBundle("missing")).toBeNull()
    expect(await isOfflineSubjectDownloaded("missing")).toBe(false)
  })

  it("lists all saved bundles", async () => {
    await saveSubjectBundle("ma2", makePayload())
    await saveSubjectBundle(
      "ri",
      makePayload({ materialCount: 3, revision: "3:2026-08-07T11:00:00Z" }),
    )

    const bundles = await getSubjectBundles()
    expect(bundles.map((b) => b.subjectId).sort()).toEqual(["ma2", "ri"])
    expect(await isOfflineSubjectDownloaded("ma2")).toBe(true)
  })

  it("overwrites an existing bundle on re-save", async () => {
    await saveSubjectBundle("ma2", makePayload())
    await saveSubjectBundle(
      "ma2",
      makePayload({ revision: "5:2026-08-07T12:00:00Z", materialCount: 9 }),
    )

    const record = await getSubjectBundle("ma2")
    expect(record!.revision).toBe("5:2026-08-07T12:00:00Z")
    expect(record!.materialCount).toBe(9)
    expect(await getSubjectBundles()).toHaveLength(1)
  })

  it("removes only the requested subject", async () => {
    await saveSubjectBundle("ma2", makePayload())
    await saveSubjectBundle("ri", makePayload({ revision: "1:2026-08-07T09:00:00Z" }))

    await removeSubjectBundle("ma2")
    expect(await getSubjectBundle("ma2")).toBeNull()
    expect(await getSubjectBundle("ri")).not.toBeNull()
  })

  it("removing a missing subject is a no-op", async () => {
    await expect(removeSubjectBundle("missing")).resolves.toBeUndefined()
  })

  it("survives closing and reopening the database", async () => {
    await saveSubjectBundle("ma2", makePayload())
    closeOfflineDb()
    expect(await getSubjectBundle("ma2")).not.toBeNull()
  })

  it("rejects with a clear error when IndexedDB is unavailable", async () => {
    vi.resetModules()
    vi.stubGlobal("indexedDB", undefined)
    const fresh = await import("@/lib/offline/db")
    await expect(fresh.getSubjectBundle("ma2")).rejects.toThrow(/IndexedDB is not available/)
  })
})
