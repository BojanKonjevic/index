import { describe, it, expect, beforeAll } from "vitest"
import { exports, env } from "cloudflare:workers"
import { runMigrations, seedSubject } from "./helpers"

type Worker = {
  fetch: (url: string | Request, init?: RequestInit) => Promise<Response>
}
const SELF = (exports as unknown as { default: Worker }).default
const db = (env as unknown as { DB: import("@cloudflare/workers-types").D1Database }).DB

function extractSessionCookie(response: Response): string {
  const match = response.headers.get("Set-Cookie")?.match(/session=([^;]+)/)
  return match ? match[1] : ""
}

async function register(name: string): Promise<string> {
  const res = await SELF.fetch("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, password: "test1234" }),
  })
  return extractSessionCookie(res)
}

async function insertMaterial(id: string) {
  await db
    .prepare(
      "INSERT OR IGNORE INTO materials (id, subject_id, title, category, file_type, url) VALUES (?, 'matematicka-analiza-2', ?, 'exam', 'pdf', ?)",
    )
    .bind(id, `Materijal ${id}`, `/api/file/${id}.pdf`)
    .run()
}

describe("history", () => {
  let cookie: string

  beforeAll(async () => {
    await runMigrations()
    await seedSubject()
    cookie = await register("historyuser")
  })

  it("requires a session", async () => {
    const getRes = await SELF.fetch("http://localhost/api/history")
    expect(getRes.status).toBe(401)
    const postRes = await SELF.fetch("http://localhost/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ materialId: "ma2-k1-kolokvijum-2015-11-15" }),
    })
    expect(postRes.status).toBe(401)
  })

  it("adds a history entry and lists it", async () => {
    const postRes = await SELF.fetch("http://localhost/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: `session=${cookie}` },
      body: JSON.stringify({ materialId: "ma2-k1-kolokvijum-2015-11-15" }),
    })
    expect(postRes.status).toBe(200)

    const res = await SELF.fetch("http://localhost/api/history", {
      headers: { Cookie: `session=${cookie}` },
    })
    expect(res.status).toBe(200)
    const body = await res.json<{
      items: Array<{ materialId: string; title: string; subjectName: string }>
    }>()
    expect(body.items[0]).toMatchObject({
      materialId: "ma2-k1-kolokvijum-2015-11-15",
      title: "K1 Kolokvijum 2015 11 15",
      subjectName: "Matematička analiza 2",
    })
  })

  it("caps the list at 50 entries with the most recent first", async () => {
    const regRes = await SELF.fetch("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "capuser", password: "test1234" }),
    })
    const { user } = await regRes.json<{ user: { id: string } }>()
    const capCookie = extractSessionCookie(regRes)

    for (let i = 0; i < 55; i++) {
      const id = `cap-material-${String(i).padStart(2, "0")}`
      await insertMaterial(id)
      await db
        .prepare(
          `INSERT INTO visit_history (id, user_id, material_id, visited_at) VALUES (?, ?, ?, datetime('now', ?))`,
        )
        .bind(`vh-cap-${i}`, user.id, id, `-${55 - i} seconds`)
        .run()
    }

    const res = await SELF.fetch("http://localhost/api/history", {
      headers: { Cookie: `session=${capCookie}` },
    })
    const body = await res.json<{ items: Array<{ materialId: string }> }>()
    expect(body.items.length).toBe(50)
    expect(body.items[0].materialId).toBe("cap-material-54")
    expect(body.items.some((i) => i.materialId === "cap-material-00")).toBe(false)
  })
})
