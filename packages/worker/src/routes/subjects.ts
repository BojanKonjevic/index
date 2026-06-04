import { Hono } from "hono"
import data from "../data/matematicka-analiza-2.json"

const app = new Hono()

app.get("/subjects", (c) => {
  const subjects = [
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
  return c.json({
    subject: data.subject,
    materials: data.materials,
    exams: data.exams,
  })
})

export default app
