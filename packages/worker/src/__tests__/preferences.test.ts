import { describe, it, expect, beforeAll } from "vitest"
import { exports } from "cloudflare:workers"
import { runMigrations } from "./helpers"

type Worker = {
  fetch: (url: string | Request, init?: RequestInit) => Promise<Response>
}
const SELF = (exports as unknown as { default: Worker }).default

describe("preferences", () => {
  let cookie: string

  beforeAll(async () => {
    await runMigrations()
    const res = await SELF.fetch("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "prefsuser", password: "test1234" }),
    })
    const setCookie = res.headers.get("Set-Cookie")
    const match = setCookie?.match(/session=([^;]+)/)
    cookie = match ? match[1] : ""
  })

  it("returns null group initially", async () => {
    const res = await SELF.fetch("http://localhost/api/preferences", {
      headers: { Cookie: `session=${cookie}` },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ group: null })
  })

  it("updates group", async () => {
    const res = await SELF.fetch("http://localhost/api/preferences", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session=${cookie}`,
      },
      body: JSON.stringify({ group: "5" }),
    })
    expect(res.status).toBe(200)
  })

  it("GET /api/preferences returns updated group", async () => {
    const res = await SELF.fetch("http://localhost/api/preferences", {
      headers: { Cookie: `session=${cookie}` },
    })
    const body = await res.json()
    expect(body).toEqual({ group: "5" })
  })

  it("returns 401 unauthenticated", async () => {
    const res = await SELF.fetch("http://localhost/api/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ group: "3" }),
    })
    expect(res.status).toBe(401)
  })
})
