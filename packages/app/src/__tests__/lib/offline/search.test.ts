import { describe, expect, it } from "vitest"
import type { OfflineSubjectPayload } from "@index/shared"
import type { OfflineSubjectRecord } from "@/lib/offline/db"
import { searchOfflinePages } from "@/lib/offline/search"

function makeBundle(
  subjectId: string,
  pages: Array<{ materialId: string; pageNumber: number; text: string }>,
  status: OfflineSubjectRecord["status"] = "complete",
): OfflineSubjectRecord {
  const materialIds = [...new Set(pages.map((p) => p.materialId))]
  const payload: OfflineSubjectPayload = {
    revision: `${materialIds.length}:2026-08-07T10:00:00Z`,
    materialCount: materialIds.length,
    subject: {
      id: subjectId,
      name: `Predmet ${subjectId}`,
      semester: 4,
      espb: 6,
      elective: false,
      electiveGroup: null,
      description: "",
      professors: [],
      assistants: [],
    },
    materials: materialIds.map((id) => ({
      id,
      subjectId,
      title: `Materijal ${id}`,
      category: "problems" as const,
      examPart: null,
      solved: null,
      fileType: "pdf" as const,
      url: `/api/file/${id}.pdf`,
      tags: [],
      assets: [],
    })),
    pages,
  }
  return {
    subjectId,
    revision: payload.revision,
    materialCount: payload.materialCount,
    downloadedAt: 1,
    status,
    payload,
  }
}

const subjectA = makeBundle("a", [
  { materialId: "a1", pageNumber: 1, text: "Prva strana govori o Loranovom redu." },
  { materialId: "a1", pageNumber: 2, text: "Druga strana pominje red ponovo, Loranov red." },
  { materialId: "a2", pageNumber: 1, text: "Ovde nema traženog pojma." },
])

describe("searchOfflinePages", () => {
  it("returns nothing for empty or short queries", () => {
    expect(searchOfflinePages([subjectA], "")).toEqual([])
    expect(searchOfflinePages([subjectA], "  ")).toEqual([])
    expect(searchOfflinePages([subjectA], "l")).toEqual([])
  })

  it("matches diacritic-insensitively and counts hits per material", () => {
    const results = searchOfflinePages([subjectA], "Loranov")
    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({
      materialId: "a1",
      subjectId: "a",
      hits: 2,
      firstPage: 1,
      offline: true,
    })
    expect(results[0].pages.map((p) => p.page)).toEqual([1, 2])
    expect(results[0].pages[0].snippet).toContain("<mark>")
  })

  it("finds matches with a normalized query", () => {
    const bundle = makeBundle("z", [
      { materialId: "z1", pageNumber: 1, text: "merenje težine tereta" },
    ])
    const results = searchOfflinePages([bundle], "tezine")
    expect(results).toHaveLength(1)
    expect(results[0].hits).toBe(1)
  })

  it("computes firstPage from the lowest matching page and sorts pages", () => {
    const bundle = makeBundle("b", [
      { materialId: "b1", pageNumber: 9, text: "tema redu" },
      { materialId: "b1", pageNumber: 2, text: "red se spominje rano" },
      { materialId: "b1", pageNumber: 4, text: "red opet" },
    ])
    const results = searchOfflinePages([bundle], "red")
    expect(results[0].firstPage).toBe(2)
    expect(results[0].pages.map((p) => p.page)).toEqual([2, 4, 9])
  })

  it("scopes to a single subject", () => {
    const subjectB = makeBundle("b", [{ materialId: "b1", pageNumber: 1, text: "Loranov red" }])
    const results = searchOfflinePages([subjectA, subjectB], "Loranov", { subjectId: "b" })
    expect(results).toHaveLength(1)
    expect(results[0].subjectId).toBe("b")
  })

  it("scopes to a single material", () => {
    const results = searchOfflinePages([subjectA], "Loranov", { materialId: "a2" })
    expect(results).toEqual([])
  })

  it("stops scanning new subjects after two matched subjects", () => {
    const subjectB = makeBundle("b", [{ materialId: "b1", pageNumber: 1, text: "Loranov red" }])
    const subjectC = makeBundle("c", [{ materialId: "c1", pageNumber: 1, text: "Loranov red" }])
    const results = searchOfflinePages([subjectA, subjectB, subjectC], "Loranov")
    const subjects = [...new Set(results.map((r) => r.subjectId))]
    expect(subjects).toEqual(["a", "b"])
    expect(subjects).not.toContain("c")
  })

  it("skips incomplete bundles", () => {
    const subjectB = makeBundle(
      "b",
      [{ materialId: "b1", pageNumber: 1, text: "Loranov red" }],
      "incomplete",
    )
    const results = searchOfflinePages([subjectB], "Loranov")
    expect(results).toEqual([])
  })

  it("respects the limit", () => {
    const bundle = makeBundle("d", [
      { materialId: "d1", pageNumber: 1, text: "Loranov red" },
      { materialId: "d2", pageNumber: 1, text: "Loranov red" },
      { materialId: "d3", pageNumber: 1, text: "Loranov red" },
    ])
    const results = searchOfflinePages([bundle], "Loranov", { limit: 2 })
    expect(results).toHaveLength(2)
  })
})
