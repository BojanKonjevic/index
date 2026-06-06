import { Hono } from "hono"
import { msg } from "../lib/i18n"
import { createSessionCookie, clearSessionCookie, getSessionUser } from "../lib/session"

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const saltHex = [...salt].map((b) => b.toString(16).padStart(2, "0")).join("")
  const data = new TextEncoder().encode(saltHex + password)
  const hash = await crypto.subtle.digest("SHA-256", data)
  const hashHex = [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("")
  return `${saltHex}:${hashHex}`
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":")

  const data = new TextEncoder().encode(saltHex + password)
  const hash = await crypto.subtle.digest("SHA-256", data)
  const computedHex = [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("")
  if (computedHex === hashHex) return true

  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map((b) => parseInt(b, 16)))
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  )
  const key = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 10_000, hash: "SHA-256" },
    keyMaterial,
    256,
  )
  const pbkdf2Hex = [...new Uint8Array(key)].map((b) => b.toString(16).padStart(2, "0")).join("")
  return pbkdf2Hex === hashHex
}

const app = new Hono<{ Bindings: { DB: D1Database; SESSION_SECRET: string } }>()

app.post("/auth/register", async (c) => {
  const { name, password, bookmarks, group } = await c.req.json()
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

  const stmts = []

  if (Array.isArray(bookmarks) && bookmarks.length > 0) {
    for (const materialId of bookmarks) {
      stmts.push(
        c.env.DB.prepare(
          "INSERT OR IGNORE INTO bookmarks (id, user_id, material_id) VALUES (?, ?, ?)",
        ).bind(crypto.randomUUID(), userId, materialId),
      )
    }
  }

  if (group) {
    stmts.push(
      c.env.DB.prepare(
        `INSERT INTO preferences (user_id, group_number, updated_at)
         VALUES (?, ?, datetime('now'))
         ON CONFLICT(user_id) DO UPDATE SET group_number = ?, updated_at = datetime('now')`,
      ).bind(userId, group, group),
    )
  }

  if (stmts.length > 0) {
    await c.env.DB.batch(stmts)
  }

  const sessionId = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  await c.env.DB.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)")
    .bind(sessionId, userId, expiresAt)
    .run()

  await createSessionCookie(c, sessionId, userId, name, c.env.SESSION_SECRET)

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

  const sessionId = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  await c.env.DB.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)")
    .bind(sessionId, user.id, expiresAt)
    .run()

  await createSessionCookie(c, sessionId, user.id, user.name, c.env.SESSION_SECRET)

  return c.json({ user: { id: user.id, name: user.name } })
})

app.get("/auth/me", async (c) => {
  const user = await getSessionUser(c, c.env.SESSION_SECRET)
  return c.json({ user })
})

app.post("/auth/logout", async (c) => {
  const user = await getSessionUser(c, c.env.SESSION_SECRET)
  if (user?.sessionId) {
    await c.env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(user.sessionId).run()
  }
  clearSessionCookie(c)
  return c.json({ ok: true })
})

export default app
