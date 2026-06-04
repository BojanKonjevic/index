import { Hono } from "hono"
import type { SubjectListItem, SubjectDetail } from "@index/shared"
import data from "../data/matematicka-analiza-2.json"

const app = new Hono()

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
  return c.json(subjects)
})

app.get("/subject/:id", (c) => {
  const id = c.req.param("id")
  if (id !== data.subject.id) {
    return c.json({ error: "Not found" }, 404)
  }
  const detail: SubjectDetail = {
    subject: data.subject,
    materials: data.materials,
    exams: data.exams,
  }
  return c.json(detail)
})

export default app
