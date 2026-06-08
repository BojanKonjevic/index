import { Hono } from "hono"
import { msg } from "../lib/i18n"
import {
  createSessionCookie,
  clearSessionCookie,
  getSessionUser,
  getValidatedSessionUser,
} from "../lib/session"
import { registerSchema, loginSchema } from "@index/shared/schemas"

const PBKDF2_ITERATIONS = 100_000

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("")
}

function hexToBytes(hex: string): Uint8Array {
  const pairs = hex.match(/.{2}/g)
  if (!pairs) return new Uint8Array(0)
  return new Uint8Array(pairs.map((b) => parseInt(b, 16)))
}

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const saltHex = bytesToHex(salt)
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  )
  const key = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt.buffer as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  )
  const hashHex = bytesToHex(new Uint8Array(key))
  return `pbkdf2:${PBKDF2_ITERATIONS}:${saltHex}:${hashHex}`
}

interface VerifyResult {
  valid: boolean
  needsRehash: boolean
  newHash?: string
}

async function verifyPassword(password: string, stored: string): Promise<VerifyResult> {
  const parts = stored.split(":")

  if (parts.length === 4 && parts[0] === "pbkdf2") {
    const iterations = parseInt(parts[1], 10)
    const salt = hexToBytes(parts[2])
    const storedHash = parts[3]
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password),
      "PBKDF2",
      false,
      ["deriveBits"],
    )
    const key = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt: salt.buffer as ArrayBuffer, iterations, hash: "SHA-256" },
      keyMaterial,
      256,
    )
    const computedHex = bytesToHex(new Uint8Array(key))
    const valid = computedHex === storedHash
    return { valid, needsRehash: valid && iterations < PBKDF2_ITERATIONS }
  }

  if (parts.length === 2 && parts[0].length === 32 && parts[1].length === 64) {
    const [saltHex, hashHex] = parts
    const data = new TextEncoder().encode(saltHex + password)
    const hash = await crypto.subtle.digest("SHA-256", data)
    const computedHex = bytesToHex(new Uint8Array(hash))
    const valid = computedHex === hashHex
    return {
      valid,
      needsRehash: valid,
      newHash: valid ? await hashPassword(password) : undefined,
    }
  }

  return { valid: false, needsRehash: false }
}

const app = new Hono<{ Bindings: { DB: D1Database; SESSION_SECRET: string } }>()

app.post("/auth/register", async (c) => {
  const raw = await c.req.json()
  const parsed = registerSchema.safeParse(raw)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    if (issue.path[0] === "name") return c.json({ error: msg(c, "auth.name_length") }, 400)
    return c.json({ error: msg(c, "auth.password_length") }, 400)
  }
  const { name, password, bookmarks, group, history } = parsed.data

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

  if (Array.isArray(history) && history.length > 0) {
    for (const materialId of history) {
      stmts.push(
        c.env.DB.prepare(
          `INSERT OR IGNORE INTO visit_history (id, user_id, material_id, visited_at)
           VALUES (?, ?, ?, datetime('now'))`,
        ).bind(crypto.randomUUID(), userId, materialId),
      )
    }
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
  const raw = await c.req.json()
  const parsed = loginSchema.safeParse(raw)
  if (!parsed.success) return c.json({ error: msg(c, "auth.required") }, 400)
  const { name, password } = parsed.data

  const user = await c.env.DB.prepare("SELECT id, name, password_hash FROM users WHERE name = ?")
    .bind(name)
    .first<{ id: string; name: string; password_hash: string }>()
  if (!user) return c.json({ error: msg(c, "auth.invalid_credentials") }, 401)

  const result = await verifyPassword(password, user.password_hash)
  if (!result.valid) return c.json({ error: msg(c, "auth.invalid_credentials") }, 401)

  if (result.needsRehash && result.newHash) {
    await c.env.DB.prepare("UPDATE users SET password_hash = ? WHERE id = ?")
      .bind(result.newHash, user.id)
      .run()
  }

  const sessionId = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  await c.env.DB.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)")
    .bind(sessionId, user.id, expiresAt)
    .run()

  await createSessionCookie(c, sessionId, user.id, user.name, c.env.SESSION_SECRET)

  return c.json({ user: { id: user.id, name: user.name } })
})

app.get("/auth/me", async (c) => {
  const user = await getValidatedSessionUser(c, c.env.DB, c.env.SESSION_SECRET)
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
