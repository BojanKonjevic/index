import { Hono } from "hono"
import type { SubjectListItem, SubjectDetail, Material, ExamEvent } from "@index/shared"
import data from "../data/matematicka-analiza-2.json"

const app = new Hono()

const CACHE_HEADERS = { "Cache-Control": "public, max-age=3600" }

app.get("/subjects", (c) => {
  const subjects: SubjectListItem[] = [
    {
      id: data.subject.id,
      name: data.subject.name,
      semester: data.subject.semester,
      espb: data.subject.espb,
      elective: data.subject.elective,
      electiveGroup: data.subject.electiveGroup,
      professors: data.subject.professors,
      materialCount: data.materials.length,
    },
  ]
  return c.json(subjects, 200, CACHE_HEADERS)
})

app.get("/subject/:id", (c) => {
  const id = c.req.param("id")
  if (id !== data.subject.id) {
    return c.json({ error: "Not found" }, 404)
  }
  const detail: SubjectDetail = {
    subject: data.subject,
    materials: data.materials as Material[],
    exams: data.exams as ExamEvent[],
  }
  return c.json(detail, 200, CACHE_HEADERS)
})

export default app
