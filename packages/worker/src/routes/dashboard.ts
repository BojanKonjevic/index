import { Hono } from "hono"
import type { Bindings } from ".."
import type { DashboardData } from "@index/shared"
import { mapMaterial, mapSubjectListItem, mapExamEvent } from "../lib/db"
const app = new Hono<{ Bindings: Bindings }>()

const DEFAULT_MATERIAL_LIMIT = 50
const MAX_MATERIAL_LIMIT = 200
const DEFAULT_EXAM_LIMIT = 20
const MAX_EXAM_LIMIT = 100

function parseLimit(raw: string | undefined, def: number, max: number): number {
  if (!raw) return def
  const v = Number(raw)
  if (!Number.isFinite(v)) return def
  return Math.min(Math.max(Math.floor(v), 1), max)
}

app.get("/dashboard", async (c) => {
  const db = c.env.DB

  const materialLimit = parseLimit(
    c.req.query("materialLimit"),
    DEFAULT_MATERIAL_LIMIT,
    MAX_MATERIAL_LIMIT,
  )
  const examLimit = parseLimit(c.req.query("examLimit"), DEFAULT_EXAM_LIMIT, MAX_EXAM_LIMIT)

  const [subjectRows, materialRows, examRows] = await Promise.all([
    db
      .prepare(
        "SELECT id, name, semester, espb, elective, elective_group, professors, (SELECT COUNT(*) FROM materials WHERE subject_id = subjects.id) as material_count FROM subjects ORDER BY semester, name",
      )
      .all(),
    db
      .prepare(
        "SELECT *, (SELECT COUNT(*) FROM material_assets WHERE material_id = materials.id) as asset_count FROM materials ORDER BY title LIMIT ?",
      )
      .bind(materialLimit)
      .all(),
    db.prepare("SELECT * FROM exams ORDER BY date LIMIT ?").bind(examLimit).all(),
  ])

  const subjects = subjectRows.results.map(mapSubjectListItem)

  const subjectNameMap: Record<string, string> = {}
  for (const s of subjects) {
    subjectNameMap[s.id] = s.name
  }

  const data: DashboardData = {
    subjects,
    materials: materialRows.results.map(mapMaterial),
    exams: examRows.results.map(mapExamEvent),
    subjectNameMap,
  }

  return c.json(data, 200)
})

export default app
