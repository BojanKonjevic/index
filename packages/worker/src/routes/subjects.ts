import { Hono } from "hono"
import { AppError } from "../lib/error"
import type { Bindings } from ".."
import type { SubjectListItem, SubjectDetail, MaterialAsset } from "@index/shared"
import { mapMaterial, mapAsset, mapSubjectListItem, mapExamEvent } from "../lib/db"

const app = new Hono<{ Bindings: Bindings }>()

app.get("/subjects", async (c) => {
  const db = c.env.DB
  const rows = await db
    .prepare(
      "SELECT s.id, s.name, s.semester, s.espb, s.elective, s.elective_group, s.professors, COALESCE(m.cnt, 0) as material_count FROM subjects s LEFT JOIN (SELECT subject_id, COUNT(*) as cnt FROM materials GROUP BY subject_id) m ON m.subject_id = s.id ORDER BY s.semester, s.name",
    )
    .all()
  const subjects: SubjectListItem[] = rows.results.map(mapSubjectListItem)
  return c.json(subjects, 200)
})

app.get("/subject/:id", async (c) => {
  const db = c.env.DB
  const id = c.req.param("id")

  const subjectRow = await db.prepare("SELECT * FROM subjects WHERE id = ?").bind(id).first()
  if (!subjectRow) throw new AppError(404, "error.notFound")

  const [materialRows, examRows, assetRows] = await Promise.all([
    db
      .prepare(
        "SELECT *, (SELECT COUNT(*) FROM material_assets WHERE material_id = materials.id) as asset_count FROM materials WHERE subject_id = ? ORDER BY title",
      )
      .bind(id)
      .all(),
    db.prepare("SELECT * FROM exams WHERE subject_id = ? ORDER BY date").bind(id).all(),
    db
      .prepare(
        "SELECT ma.* FROM material_assets ma JOIN materials m ON m.id = ma.material_id WHERE m.subject_id = ? ORDER BY ma.material_id, ma.page_number",
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

  const detail: SubjectDetail = {
    subject: {
      id: subjectRow.id as string,
      name: subjectRow.name as string,
      semester: subjectRow.semester as number,
      espb: subjectRow.espb as number,
      elective: (subjectRow.elective as number) === 1,
      electiveGroup: (subjectRow.elective_group as string) ?? null,
      description: (subjectRow.description as string) ?? "",
      professors: JSON.parse((subjectRow.professors as string) || "[]"),
      assistants: JSON.parse((subjectRow.assistants as string) || "[]"),
    },
    materials: materialRows.results.map((r) => {
      const m = mapMaterial(r)
      m.assets = assetsByMaterialId.get(m.id) ?? []
      return m
    }),
    exams: examRows.results.map(mapExamEvent),
  }
  return c.json(detail, 200)
})

app.get("/material/:id/assets", async (c) => {
  const id = c.req.param("id")
  const rows = await c.env.DB.prepare(
    "SELECT * FROM material_assets WHERE material_id = ? ORDER BY page_number",
  )
    .bind(id)
    .all()
  const assets: MaterialAsset[] = rows.results.map(mapAsset)
  return c.json(assets, 200)
})

export default app
