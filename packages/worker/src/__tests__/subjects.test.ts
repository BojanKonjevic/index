import { describe, it, expect, beforeAll } from "vitest"
import { exports } from "cloudflare:workers"
import { runMigrations, seedSubject } from "./helpers"

type Worker = {
  fetch: (url: string | Request, init?: RequestInit) => Promise<Response>
}
const SELF = (exports as unknown as { default: Worker }).default

beforeAll(async () => {
  await runMigrations()
  await seedSubject()
})

describe("GET /api/subjects", () => {
  it("returns all subjects", async () => {
    const res = await SELF.fetch("http://localhost/api/subjects")
    expect(res.status).toBe(200)
    const body = await res.json<Array<{ id: string; name: string; semester: number }>>()
    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBeGreaterThan(0)
    expect(body[0]).toHaveProperty("id")
    expect(body[0]).toHaveProperty("name")
    expect(body[0]).toHaveProperty("semester")
    expect(body[0]).toHaveProperty("materialCount")
  })
})

describe("GET /api/subject/:id", () => {
  it("returns subject with nested materials", async () => {
    const res = await SELF.fetch("http://localhost/api/subject/matematicka-analiza-2")
    expect(res.status).toBe(200)
    const body = await res.json<{
      subject: { id: string; name: string }
      materials: Array<{ id: string }>
      exams: Array<{ id: string }>
    }>()
    expect(body.subject.id).toBe("matematicka-analiza-2")
    expect(body.subject.name).toBe("Matematička analiza 2")
    expect(Array.isArray(body.materials)).toBe(true)
    expect(body.materials.length).toBeGreaterThan(0)
    expect(Array.isArray(body.exams)).toBe(true)
  })

  it("returns 404 for unknown subject", async () => {
    const res = await SELF.fetch("http://localhost/api/subject/nonexistent")
    expect(res.status).toBe(404)
  })
})
