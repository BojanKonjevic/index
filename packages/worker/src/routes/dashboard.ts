import { Hono } from "hono"
import type { Bindings } from ".."
import type { DashboardData } from "@index/shared"
import { mapMaterial, mapSubjectListItem, mapExamEvent } from "../lib/db"

const app = new Hono<{ Bindings: Bindings }>()

app.get("/dashboard", async (c) => {
  const db = c.env.DB

  const materialLimit = Math.min(Math.max(Number(c.req.query("materialLimit")) || 9999, 1), 9999)
  const examLimit = Math.min(Math.max(Number(c.req.query("examLimit")) || 9999, 1), 9999)

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
