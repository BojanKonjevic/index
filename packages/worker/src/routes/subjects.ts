import { Hono } from "hono"
import { msg } from "../lib/i18n"
import type { Bindings } from ".."
import type { SubjectListItem, SubjectDetail, ExamEvent } from "@index/shared"
import { mapMaterial, mapAsset } from "../lib/db"

function mapSubjectListItem(row: Record<string, unknown>): SubjectListItem {
  return {
    id: row.id as string,
    name: row.name as string,
    semester: row.semester as number,
    espb: row.espb as number,
    elective: (row.elective as number) === 1,
    electiveGroup: (row.elective_group as string) ?? null,
    professors: JSON.parse((row.professors as string) || "[]"),
    materialCount: row.material_count as number,
  }
}

function mapExamEvent(row: Record<string, unknown>): ExamEvent {
  return {
    id: row.id as string,
    subjectId: row.subject_id as string,
    title: row.title as string,
    date: row.date as string,
    time: row.time as string,
    location: row.location as string,
  }
}

const app = new Hono<{ Bindings: Bindings }>()

app.get("/subjects", async (c) => {
  const db = c.env.DB
  const rows = await db
    .prepare(
      "SELECT id, name, semester, espb, elective, elective_group, professors, (SELECT COUNT(*) FROM materials WHERE subject_id = subjects.id) as material_count FROM subjects ORDER BY semester, name",
    )
    .all()
  const subjects: SubjectListItem[] = rows.results.map(mapSubjectListItem)
  return c.json(subjects, 200)
})

app.get("/subject/:id", async (c) => {
  const db = c.env.DB
  const id = c.req.param("id")

  const subjectRow = await db.prepare("SELECT * FROM subjects WHERE id = ?").bind(id).first()
  if (!subjectRow) return c.json({ error: msg(c, "error.notFound") }, 404)

  const [materialRows, examRows, assetRows] = await Promise.all([
    db.prepare("SELECT * FROM materials WHERE subject_id = ? ORDER BY title").bind(id).all(),
    db.prepare("SELECT * FROM exams WHERE subject_id = ? ORDER BY date").bind(id).all(),
    db
      .prepare(
        "SELECT * FROM material_assets WHERE material_id IN (SELECT id FROM materials WHERE subject_id = ?) ORDER BY material_id, page_number",
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

export default app
