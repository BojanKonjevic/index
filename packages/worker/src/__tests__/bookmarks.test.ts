import { describe, it, expect, beforeAll } from "vitest"
import { exports } from "cloudflare:workers"
import { runMigrations, seedSubject } from "./helpers"

type Worker = {
  fetch: (url: string | Request, init?: RequestInit) => Promise<Response>
}
const SELF = (exports as unknown as { default: Worker }).default

function extractSessionCookie(response: Response): string {
  const setCookie = response.headers.get("Set-Cookie")
  if (!setCookie) return ""
  const match = setCookie.match(/session=([^;]+)/)
  return match ? match[1] : ""
}

describe("bookmark CRUD", () => {
  let cookie: string
  const materialId = "ma2-k1-kolokvijum-2015-11-15"

  beforeAll(async () => {
    await runMigrations()
    await seedSubject()
    const res = await SELF.fetch("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "bookmarkuser", password: "test1234" }),
    })
    cookie = extractSessionCookie(res)
  })

  it("returns 401 unauthenticated", async () => {
    const res = await SELF.fetch("http://localhost/api/bookmarks")
    expect(res.status).toBe(401)
  })

  it("returns empty list for new user", async () => {
    const res = await SELF.fetch("http://localhost/api/bookmarks", {
      headers: { Cookie: `session=${cookie}` },
    })
    expect(res.status).toBe(200)
    const body = await res.json<{ ids: string[] }>()
    expect(body.ids).toEqual([])
  })

  it("creates a bookmark", async () => {
    const res = await SELF.fetch("http://localhost/api/bookmarks/add", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session=${cookie}`,
      },
      body: JSON.stringify({ materialId }),
    })
    expect(res.status).toBe(200)
    const body = await res.json<{ ok: boolean }>()
    expect(body.ok).toBe(true)
  })

  it("GET /api/bookmarks returns the added bookmark", async () => {
    const res = await SELF.fetch("http://localhost/api/bookmarks", {
      headers: { Cookie: `session=${cookie}` },
    })
    expect(res.status).toBe(200)
    const body = await res.json<{ ids: string[] }>()
    expect(body.ids).toContain(materialId)
  })

  it("removes the bookmark", async () => {
    const res = await SELF.fetch("http://localhost/api/bookmarks/remove", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session=${cookie}`,
      },
      body: JSON.stringify({ materialId }),
    })
    expect(res.status).toBe(200)
  })

  it("GET /api/bookmarks is empty after removal", async () => {
    const res = await SELF.fetch("http://localhost/api/bookmarks", {
      headers: { Cookie: `session=${cookie}` },
    })
    const body = await res.json<{ ids: string[] }>()
    expect(body.ids).not.toContain(materialId)
  })

  it("returns 401 unauthenticated for add", async () => {
    const res = await SELF.fetch("http://localhost/api/bookmarks/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ materialId }),
    })
    expect(res.status).toBe(401)
  })
})
