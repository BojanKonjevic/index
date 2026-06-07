import type { Material, MaterialAsset } from "@index/shared"

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
    tags: JSON.parse((row.tags as string) || "[]"),
    pageCount: row.page_count as number | undefined,
    assets: [],
  }
}

export function mapAsset(row: Record<string, unknown>): MaterialAsset {
  return {
    id: row.id as string,
    materialId: row.material_id as string,
    pageNumber: row.page_number as number,
    url: row.url as string,
  }
}
