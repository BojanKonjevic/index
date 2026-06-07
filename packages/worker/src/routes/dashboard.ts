import { Hono } from "hono"
import type { Bindings } from ".."
import type { DashboardData, SubjectListItem, ExamEvent } from "@index/shared"
import { mapMaterial } from "../lib/db"

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
    db.prepare("SELECT * FROM materials ORDER BY title LIMIT ?").bind(materialLimit).all(),
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
