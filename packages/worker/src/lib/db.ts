import type { Material, MaterialAsset, SubjectListItem, ExamEvent } from "@index/shared"

function safeJsonParse<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== "string") return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function mapMaterial(row: Record<string, unknown>): Material {
  return {
    id: row.id as string,
    subjectId: row.subject_id as string,
    title: row.title as string,
    category: row.category as Material["category"],
    examPart: (row.exam_part as string) ?? null,
    solved: row.solved === null ? null : (row.solved as number) === 1,
    fileType: row.file_type as Material["fileType"],
    url: row.url as string,
    tags: safeJsonParse<string[]>(row.tags, []),
    pageCount: row.page_count as number | undefined,
    assets: [],
    assetCount: (row.asset_count as number) ?? 0,
  }
}

export function mapAsset(row: Record<string, unknown>): MaterialAsset {
  return {
    id: row.id as string,
    materialId: row.material_id as string,
    pageNumber: row.page_number as number,
    name: row.name as string,
    fileType: (row.file_type as MaterialAsset["fileType"]) ?? "image",
    url: row.url as string,
  }
}

export function mapSubjectListItem(row: Record<string, unknown>): SubjectListItem {
  return {
    id: row.id as string,
    name: row.name as string,
    semester: row.semester as number,
    espb: row.espb as number,
    elective: (row.elective as number) === 1,
    electiveGroup: (row.elective_group as string) ?? null,
    professors: safeJsonParse<string[]>(row.professors, []),
    materialCount: row.material_count as number,
  }
}

export function mapExamEvent(row: Record<string, unknown>): ExamEvent {
  return {
    id: row.id as string,
    subjectId: row.subject_id as string,
    title: row.title as string,
    date: row.date as string,
    time: row.time as string,
    location: row.location as string,
  }
}
