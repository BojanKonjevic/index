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

  it("reports totalMaterials independent of the page", async () => {
    const full = await (
      await SELF.fetch("http://localhost/api/subject/matematicka-analiza-2")
    ).json<{ materials: Array<{ id: string }>; totalMaterials: number; revision: string }>()
    const page = await (
      await SELF.fetch("http://localhost/api/subject/matematicka-analiza-2?limit=1")
    ).json<{ materials: Array<{ id: string }>; totalMaterials: number; revision: string }>()

    expect(page.materials).toHaveLength(1)
    expect(page.totalMaterials).toBe(full.totalMaterials)
    expect(page.totalMaterials).toBeGreaterThan(full.materials.length)
    // revision still describes the whole set, so offline staleness checks keep working
    expect(page.revision).toBe(full.revision)
    expect(page.revision.startsWith(`${page.totalMaterials}:`)).toBe(true)
  })

  it("paginates materials with page and limit", async () => {
    const p1 = await (
      await SELF.fetch("http://localhost/api/subject/matematicka-analiza-2?limit=1&page=1")
    ).json<{ materials: Array<{ id: string }> }>()
    const p2 = await (
      await SELF.fetch("http://localhost/api/subject/matematicka-analiza-2?limit=1&page=2")
    ).json<{ materials: Array<{ id: string }> }>()

    expect(p1.materials).toHaveLength(1)
    expect(p2.materials).toHaveLength(1)
    expect(p2.materials[0].id).not.toBe(p1.materials[0].id)
  })

  it("falls back to defaults for invalid page and limit", async () => {
    const res = await SELF.fetch(
      "http://localhost/api/subject/matematicka-analiza-2?page=abc&limit=abc",
    )
    expect(res.status).toBe(200)
    const body = await res.json<{ materials: Array<{ id: string }>; totalMaterials: number }>()
    expect(body.materials.length).toBe(50)
    expect(body.totalMaterials).toBeGreaterThan(50)
  })

  it("clamps out of range limit into 1..500", async () => {
    const low = await (
      await SELF.fetch("http://localhost/api/subject/matematicka-analiza-2?limit=-5")
    ).json<{ materials: Array<{ id: string }> }>()
    expect(low.materials).toHaveLength(1)
  })

  it("returns the whole subject at the max limit for viewer deep links", async () => {
    const res = await SELF.fetch("http://localhost/api/subject/matematicka-analiza-2?limit=200")
    const body = await res.json<{ materials: Array<{ id: string }>; totalMaterials: number }>()
    expect(body.materials.length).toBe(body.totalMaterials)
    expect(body.materials.some((m) => m.id === "ma2-vezbe-01")).toBe(true)
  })
})
