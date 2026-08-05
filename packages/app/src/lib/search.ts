import { useMemo } from "react"
import Fuse from "fuse.js"
import type { Material, ExamEvent } from "@index/shared"
import { normalizeSr, srGetFn } from "@/lib/normalize"

export type SearchResultItem = {
  id: string
  label: string
  description: string
  type: "subject" | "material" | "exam"
  subtype?: string
  to: string
  params: Record<string, string>
}

export type GlobalData = {
  subjects: Array<{ id: string; name: string; semester: number; espb: number }>
  materials: Material[]
  exams: ExamEvent[]
  subjectNameMap: Record<string, string>
  semestarLabel?: string
}

function buildGlobalIndex(data: GlobalData): SearchResultItem[] {
  const items: SearchResultItem[] = []

  for (const subject of data.subjects) {
    items.push({
      id: subject.id,
      label: subject.name,
      description: `${subject.semester}. ${data.semestarLabel || "semestar"} · ${subject.espb} ESPB`,
      type: "subject",
      to: "/subjects/$subjectId",
      params: { subjectId: subject.id },
    })
  }

  for (const material of data.materials) {
    items.push({
      id: material.id,
      label: material.title,
      description: data.subjectNameMap[material.subjectId] ?? "",
      type: "material",
      subtype:
        material.category === "exam" && material.examPart
          ? material.examPart.toLowerCase()
          : undefined,
      to: "/subjects/$subjectId/materials/$materialId",
      params: { subjectId: material.subjectId, materialId: material.id },
    })
  }

  for (const exam of data.exams) {
    items.push({
      id: exam.id,
      label: exam.title,
      description: data.subjectNameMap[exam.subjectId] ?? "",
      type: "exam",
      to: "/subjects/$subjectId",
      params: { subjectId: exam.subjectId },
    })
  }

  return items
}

export function useGlobalSearch(data: GlobalData | null, query: string, limit = 8) {
  const index = useMemo(() => (data ? buildGlobalIndex(data) : []), [data])

  const fuse = useMemo(
    () =>
      new Fuse(index, {
        keys: ["label", "description"],
        threshold: 0.4,
        getFn: srGetFn,
      }),
    [index],
  )

  return useMemo(() => {
    if (!query.trim()) return []
    return fuse
      .search(normalizeSr(query))
      .slice(0, limit)
      .map((r) => r.item)
  }, [fuse, query, limit])
}
