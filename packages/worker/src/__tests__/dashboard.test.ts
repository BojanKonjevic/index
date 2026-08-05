import { describe, it, expect, beforeAll } from "vitest"
import { exports } from "cloudflare:workers"
import { runMigrations, seedSubject, seedExam } from "./helpers"

type Worker = {
  fetch: (url: string | Request, init?: RequestInit) => Promise<Response>
}
const SELF = (exports as unknown as { default: Worker }).default

type Dashboard = {
  subjects: Array<{ id: string; name: string; materialCount: number }>
  materials: Array<{ id: string; assetCount: number }>
  exams: Array<{ id: string; subjectId: string; title: string; date: string }>
  subjectNameMap: Record<string, string>
}

describe("GET /api/dashboard", () => {
  beforeAll(async () => {
    await runMigrations()
    await seedSubject()
    await seedExam()
  })

  it("returns subjects, materials, exams and subject name map", async () => {
    const res = await SELF.fetch("http://localhost/api/dashboard")
    expect(res.status).toBe(200)
    const body = await res.json<Dashboard>()

    expect(body.subjects.length).toBeGreaterThan(0)
    expect(body.subjects[0].name).toBe("Matematička analiza 2")
    expect(body.subjects[0].materialCount).toBeGreaterThan(0)

    expect(body.materials.length).toBeGreaterThan(0)
    expect(body.materials.some((m) => m.assetCount > 0)).toBe(true)

    expect(body.exams).toHaveLength(1)
    expect(body.exams[0]).toMatchObject({ subjectId: "matematicka-analiza-2", title: "Test ispit" })

    expect(body.subjectNameMap["matematicka-analiza-2"]).toBe("Matematička analiza 2")
  })

  it("orders exams by date ascending", async () => {
    const res = await SELF.fetch("http://localhost/api/dashboard")
    const body = await res.json<Dashboard>()
    const dates = body.exams.map((e) => e.date)
    expect([...dates].sort()).toEqual(dates)
  })

  it("respects the materialLimit param", async () => {
    const res = await SELF.fetch("http://localhost/api/dashboard?materialLimit=1")
    const body = await res.json<Dashboard>()
    expect(body.materials.length).toBe(1)
  })

  it("respects the examLimit param", async () => {
    const res = await SELF.fetch("http://localhost/api/dashboard?examLimit=1")
    const body = await res.json<Dashboard>()
    expect(body.exams.length).toBe(1)
  })
})
