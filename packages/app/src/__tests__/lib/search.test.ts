import { describe, it, expect } from "vitest"
import { renderHook } from "@testing-library/react"
import { useGlobalSearch, type GlobalData } from "@/lib/search"
import { useFuseSearch } from "@/hooks/useFuseSearch"

const data: GlobalData = {
  subjects: [{ id: "ma2", name: "Matematička analiza 2", semester: 4, espb: 8 }],
  materials: [
    {
      id: "ri-vezbe-01",
      subjectId: "ri",
      title: "Vežbe 01",
      category: "problems",
      examPart: null,
      solved: null,
      fileType: "pdf",
      url: "/api/file/vezbe.pdf",
      tags: [],
      assets: [],
    },
  ],
  exams: [
    {
      id: "ri-exam-1",
      subjectId: "ri",
      title: "Septembarski rok",
      date: "2026-09-01",
      time: "09:00",
      location: "A1",
    },
  ],
  subjectNameMap: { ma2: "Matematička analiza 2", ri: "Računarska inteligencija" },
}

describe("useGlobalSearch", () => {
  it("returns nothing for an empty query", () => {
    const { result } = renderHook(() => useGlobalSearch(data, ""))
    expect(result.current).toHaveLength(0)
  })

  it("matches Serbian diacritics in labels and descriptions", () => {
    const { result } = renderHook(() => useGlobalSearch(data, "racunarska"))
    expect(result.current.map((i) => i.id)).toEqual(["ri-vezbe-01", "ri-exam-1"])
  })

  it("returns the same results as useFuseSearch for the same normalized query", () => {
    const fuseItems = data.subjects.map((s) => ({ name: s.name }))
    const { result: fuseResult } = renderHook(() =>
      useFuseSearch(fuseItems, { keys: ["name"], threshold: 0.4 }, "matematicka analiza"),
    )
    const { result: globalResult } = renderHook(() => useGlobalSearch(data, "matematicka analiza"))
    expect(fuseResult.current.map((i) => i.name)).toEqual(globalResult.current.map((i) => i.label))
  })

  it("respects the limit", () => {
    const { result } = renderHook(() => useGlobalSearch(data, "a", 1))
    expect(result.current.length).toBeLessThanOrEqual(1)
  })
})
