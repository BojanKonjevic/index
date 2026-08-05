import { describe, it, expect, beforeAll } from "vitest"
import { exports } from "cloudflare:workers"
import { runMigrations } from "./helpers"

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

describe("POST /api/auth/register", () => {
  beforeAll(runMigrations)

  it("creates a user and returns 201", async () => {
    const res = await SELF.fetch("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "testuser", password: "test1234" }),
    })
    expect(res.status).toBe(201)
    const body = await res.json<{ user: { id: string; name: string } }>()
    expect(body.user.name).toBe("testuser")
    expect(body.user.id).toBeDefined()
    expect(res.headers.get("Set-Cookie")).toContain("session=")
  })

  it("returns 409 for duplicate username", async () => {
    const res = await SELF.fetch("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "testuser", password: "test1234" }),
    })
    expect(res.status).toBe(409)
  })

  it("returns 400 for short name", async () => {
    const res = await SELF.fetch("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "ab", password: "test1234" }),
    })
    expect(res.status).toBe(400)
    const body = await res.json<{ error: string }>()
    expect(body.error).toContain("Ime")
  })

  it("returns 400 for short password", async () => {
    const res = await SELF.fetch("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "shortpass", password: "abcd" }),
    })
    expect(res.status).toBe(400)
    const body = await res.json<{ error: string }>()
    expect(body.error).toContain("Lozinka")
  })

  it("returns 400 for overlong password", async () => {
    const res = await SELF.fetch("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "longpass", password: "x".repeat(129) }),
    })
    expect(res.status).toBe(400)
    const body = await res.json<{ error: string }>()
    expect(body.error).toContain("Lozinka")
  })

  it("returns 400 with generic message for invalid field types", async () => {
    const res = await SELF.fetch("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "goodname", password: "test1234", bookmarks: "not-an-array" }),
    })
    expect(res.status).toBe(400)
    const body = await res.json<{ error: string }>()
    expect(body.error).toContain("Neispravni podaci")
  })
})

describe("POST /api/auth/login", () => {
  beforeAll(async () => {
    await runMigrations()
    await SELF.fetch("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "loginuser", password: "test1234" }),
    })
  })

  it("returns session with correct credentials", async () => {
    const res = await SELF.fetch("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "loginuser", password: "test1234" }),
    })
    expect(res.status).toBe(200)
    const body = await res.json<{ user: { id: string; name: string } }>()
    expect(body.user.name).toBe("loginuser")
    expect(res.headers.get("Set-Cookie")).toContain("session=")
  })

  it("returns 401 for wrong password", async () => {
    const res = await SELF.fetch("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "loginuser", password: "wrongpass" }),
    })
    expect(res.status).toBe(401)
  })
})

describe("GET /api/auth/me", () => {
  let cookie: string

  beforeAll(async () => {
    await runMigrations()
    const res = await SELF.fetch("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "checkuser", password: "test1234" }),
    })
    cookie = extractSessionCookie(res)
  })

  it("returns user with valid session", async () => {
    const res = await SELF.fetch("http://localhost/api/auth/me", {
      headers: { Cookie: `session=${cookie}` },
    })
    expect(res.status).toBe(200)
    const body = await res.json<{ user: { name: string } }>()
    expect(body.user).toBeDefined()
    expect(body.user.name).toBe("checkuser")
  })

  it("returns null user without session", async () => {
    const res = await SELF.fetch("http://localhost/api/auth/me")
    await expect(res.json()).resolves.toEqual({ user: null })
  })
})
