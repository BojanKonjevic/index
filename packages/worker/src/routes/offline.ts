import { Hono } from "hono"
import type { Bindings } from ".."
import type { Material, OfflineSubjectPayload, Subject } from "@index/shared"
import { mapMaterial, mapAsset } from "../lib/db"
import { AppError } from "../lib/error"

const app = new Hono<{ Bindings: Bindings }>()

app.get("/offline/subject/:id", async (c) => {
  const db = c.env.DB
  const id = c.req.param("id")

  const subjectRow = await db.prepare("SELECT * FROM subjects WHERE id = ?").bind(id).first()
  if (!subjectRow) throw new AppError(404, "error.notFound")

  const [materialRows, assetRows, pageRows] = await Promise.all([
    db.prepare("SELECT * FROM materials WHERE subject_id = ? ORDER BY title").bind(id).all(),
    db
      .prepare(
        "SELECT ma.* FROM material_assets ma JOIN materials m ON m.id = ma.material_id WHERE m.subject_id = ? ORDER BY ma.material_id, ma.page_number",
      )
      .bind(id)
      .all(),
    db
      .prepare(
        "SELECT material_id, page_number, orig FROM material_pages_fts WHERE source = 'pdf' AND material_id IN (SELECT id FROM materials WHERE subject_id = ?) ORDER BY material_id, page_number",
      )
      .bind(id)
      .all(),
  ])

  const assetsByMaterialId = new Map<string, ReturnType<typeof mapAsset>[]>()
  for (const row of assetRows.results) {
    const asset = mapAsset(row)
    const list = assetsByMaterialId.get(asset.materialId)
    if (list) list.push(asset)
    else assetsByMaterialId.set(asset.materialId, [asset])
  }

  const materialRowsTyped = materialRows.results as Array<
    Record<string, unknown> & { created_at: string }
  >
  const materials: Material[] = materialRowsTyped.map((r) => {
    const m = mapMaterial(r)
    m.assets = assetsByMaterialId.get(m.id) ?? []
    return m
  })

  const maxCreatedAt = materialRowsTyped.reduce(
    (max, r) => (r.created_at > max ? r.created_at : max),
    "",
  )

  const subject: Subject = {
    id: subjectRow.id as string,
    name: subjectRow.name as string,
    semester: subjectRow.semester as number,
    espb: subjectRow.espb as number,
    elective: (subjectRow.elective as number) === 1,
    electiveGroup: (subjectRow.elective_group as string) ?? null,
    description: (subjectRow.description as string) ?? "",
    professors: JSON.parse((subjectRow.professors as string) || "[]"),
    assistants: JSON.parse((subjectRow.assistants as string) || "[]"),
  }

  const payload: OfflineSubjectPayload = {
    revision: `${materials.length}:${maxCreatedAt}`,
    materialCount: materials.length,
    subject,
    materials,
    pages: pageRows.results.map((r) => ({
      materialId: r.material_id as string,
      pageNumber: r.page_number as number,
      text: r.orig as string,
    })),
  }

  return c.json(payload, 200)
})

export default app
