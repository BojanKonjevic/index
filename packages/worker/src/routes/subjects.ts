import { Hono } from "hono"
import type { Bindings } from ".."
import type { SubjectListItem, SubjectDetail, Material, ExamEvent } from "@index/shared"

const app = new Hono<{ Bindings: Bindings }>()

app.get("/subjects", async (c) => {
  const db = c.env.DB
  const rows = await db
    .prepare(
      "SELECT id, name, semester, espb, elective, elective_group, professors, (SELECT COUNT(*) FROM materials WHERE subject_id = subjects.id) as material_count FROM subjects ORDER BY semester, name",
    )
    .all()
  const subjects: SubjectListItem[] = rows.results.map((r: any) => ({
    id: r.id,
    name: r.name,
    semester: r.semester,
    espb: r.espb,
    elective: r.elective === 1,
    electiveGroup: r.elective_group,
    professors: JSON.parse(r.professors || "[]"),
    materialCount: r.material_count,
  }))
  return c.json(subjects, 200)
})

app.get("/subject/:id", async (c) => {
  const db = c.env.DB
  const id = c.req.param("id")

  const subjectRow = await db.prepare("SELECT * FROM subjects WHERE id = ?").bind(id).first<any>()
  if (!subjectRow) return c.json({ error: "Not found" }, 404)

  const materialRows = await db
    .prepare("SELECT * FROM materials WHERE subject_id = ? ORDER BY title")
    .bind(id)
    .all()
  const examRows = await db
    .prepare("SELECT * FROM exams WHERE subject_id = ? ORDER BY date")
    .bind(id)
    .all()

  const detail: SubjectDetail = {
    subject: {
      id: subjectRow.id,
      name: subjectRow.name,
      semester: subjectRow.semester,
      espb: subjectRow.espb,
      elective: subjectRow.elective === 1,
      electiveGroup: subjectRow.elective_group,
      description: subjectRow.description,
      professors: JSON.parse(subjectRow.professors || "[]"),
      assistants: JSON.parse(subjectRow.assistants || "[]"),
    },
    materials: materialRows.results.map((r: any) => ({
      id: r.id,
      subjectId: r.subject_id,
      title: r.title,
      category: r.category,
      examPart: r.exam_part,
      solved: r.solved === null ? null : r.solved === 1,
      fileType: r.file_type,
      url: r.url,
      tags: JSON.parse(r.tags || "[]"),
      pageCount: r.page_count,
    })) as Material[],
    exams: examRows.results.map((r: any) => ({
      id: r.id,
      subjectId: r.subject_id,
      title: r.title,
      date: r.date,
      time: r.time,
      location: r.location,
    })) as ExamEvent[],
  }
  return c.json(detail, 200)
})

export default app
