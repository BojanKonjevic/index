import { Hono } from "hono"
import { setCookie, getCookie, deleteCookie } from "hono/cookie"
import { msg } from "../lib/i18n"

const ITERATIONS = 100_000

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  )
  const key = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    256,
  )
  const saltHex = [...salt].map((b) => b.toString(16).padStart(2, "0")).join("")
  const keyHex = [...new Uint8Array(key)].map((b) => b.toString(16).padStart(2, "0")).join("")
  return `${saltHex}:${keyHex}`
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, keyHex] = stored.split(":")
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map((b) => parseInt(b, 16)))
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  )
  const key = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    256,
  )
  const computedHex = [...new Uint8Array(key)].map((b) => b.toString(16).padStart(2, "0")).join("")
  return computedHex === keyHex
}

function setSessionCookie(c: Parameters<typeof setCookie>[0], sessionId: string) {
  setCookie(c, "session", sessionId, {
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    maxAge: 60 * 60 * 24 * 30,
  })
}

function clearSessionCookie(c: Parameters<typeof setCookie>[0]) {
  deleteCookie(c, "session", { path: "/" })
}

async function createSession(db: D1Database, userId: string): Promise<string> {
  const sessionId = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  await db
    .prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)")
    .bind(sessionId, userId, expiresAt)
    .run()
  return sessionId
}

async function getSessionUser(db: D1Database, sessionId: string | undefined) {
  if (!sessionId) return null
  const row = await db
    .prepare(
      "SELECT u.id, u.name FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ? AND s.expires_at > datetime('now')",
    )
    .bind(sessionId)
    .first<{ id: string; name: string }>()
  return row ?? null
}

const app = new Hono<{ Bindings: { DB: D1Database } }>()

app.post("/auth/register", async (c) => {
  const { name, password } = await c.req.json()
  if (!name || !password) return c.json({ error: msg(c, "auth.required") }, 400)
  if (name.length < 3 || name.length > 50) return c.json({ error: msg(c, "auth.name_length") }, 400)
  if (password.length < 4) return c.json({ error: msg(c, "auth.password_length") }, 400)

  const existing = await c.env.DB.prepare("SELECT id FROM users WHERE name = ?").bind(name).first()
  if (existing) return c.json({ error: msg(c, "auth.username_taken") }, 409)

  const userId = crypto.randomUUID()
  const passwordHash = await hashPassword(password)
  await c.env.DB.prepare("INSERT INTO users (id, name, password_hash) VALUES (?, ?, ?)")
    .bind(userId, name, passwordHash)
    .run()

  const sessionId = await createSession(c.env.DB, userId)
  setSessionCookie(c, sessionId)

  return c.json({ user: { id: userId, name: name } }, 201)
})

app.post("/auth/login", async (c) => {
  const { name, password } = await c.req.json()
  if (!name || !password) return c.json({ error: msg(c, "auth.required") }, 400)

  const user = await c.env.DB.prepare("SELECT id, name, password_hash FROM users WHERE name = ?")
    .bind(name)
    .first<{ id: string; name: string; password_hash: string }>()
  if (!user) return c.json({ error: msg(c, "auth.invalid_credentials") }, 401)

  const valid = await verifyPassword(password, user.password_hash)
  if (!valid) return c.json({ error: msg(c, "auth.invalid_credentials") }, 401)

  const sessionId = await createSession(c.env.DB, user.id)
  setSessionCookie(c, sessionId)

  return c.json({ user: { id: user.id, name: user.name } })
})

app.get("/auth/me", async (c) => {
  const sessionId = getCookie(c, "session")
  const user = await getSessionUser(c.env.DB, sessionId)
  return c.json({ user })
})

app.post("/auth/logout", async (c) => {
  const sessionId = getCookie(c, "session")
  if (sessionId) {
    await c.env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(sessionId).run()
  }
  clearSessionCookie(c)
  return c.json({ ok: true })
})

export default app
