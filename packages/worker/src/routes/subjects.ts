import { Hono } from "hono"
import type { SubjectListItem, SubjectDetail, Material, ExamEvent } from "@index/shared"
import { subjectData } from "../data/index"

const app = new Hono()

const CACHE_HEADERS = { "Cache-Control": "public, max-age=3600" }

app.get("/subjects", (c) => {
  const subjects: SubjectListItem[] = Object.values(subjectData).map((d) => ({
    id: d.subject.id,
    name: d.subject.name,
    semester: d.subject.semester,
    espb: d.subject.espb,
    elective: d.subject.elective,
    electiveGroup: d.subject.electiveGroup,
    professors: d.subject.professors,
    materialCount: d.materials.length,
  }))
  return c.json(subjects, 200, CACHE_HEADERS)
})

app.get("/subject/:id", (c) => {
  const id = c.req.param("id")
  const data = subjectData[id]
  if (!data) return c.json({ error: "Not found" }, 404)
  const detail: SubjectDetail = {
    subject: data.subject,
    materials: data.materials as Material[],
    exams: data.exams as ExamEvent[],
  }
  return c.json(detail, 200, CACHE_HEADERS)
})

export default app
