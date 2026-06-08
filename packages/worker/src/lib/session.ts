import type { Context } from "hono"
import { setCookie, getCookie, deleteCookie } from "hono/cookie"
import { createMiddleware } from "hono/factory"
import { msg } from "./i18n"

interface SessionPayload {
  sessionId: string
  userId: string
  name: string
  expiresAt: string
}

function base64UrlEncode(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

function base64UrlDecode(str: string): Uint8Array {
  str = str.replace(/-/g, "+").replace(/_/g, "/")
  while (str.length % 4) str += "="
  return Uint8Array.from(atob(str), (c) => c.charCodeAt(0))
}

async function sign(payload: SessionPayload, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(JSON.stringify(payload))
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const signature = await crypto.subtle.sign("HMAC", key, data)
  return `${base64UrlEncode(new Uint8Array(data))}.${base64UrlEncode(new Uint8Array(signature))}`
}

async function verify(token: string, secret: string): Promise<SessionPayload | null> {
  const parts = token.split(".")
  if (parts.length !== 2) return null
  try {
    const data = base64UrlDecode(parts[0])
    const sig = base64UrlDecode(parts[1])
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    )
    const valid = await crypto.subtle.verify("HMAC", key, sig as BufferSource, data as BufferSource)
    if (!valid) return null
    const payload: SessionPayload = JSON.parse(new TextDecoder().decode(data))
    if (new Date(payload.expiresAt) < new Date()) return null
    return payload
  } catch {
    return null
  }
}

export async function createSessionCookie(
  c: Context,
  sessionId: string,
  userId: string,
  name: string,
  secret: string,
) {
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  const payload: SessionPayload = { sessionId, userId, name, expiresAt }
  const token = await sign(payload, secret)
  setCookie(c, "session", token, {
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    maxAge: 60 * 60 * 24 * 30,
  })
}

export function clearSessionCookie(c: Context) {
  deleteCookie(c, "session", { path: "/" })
}

export async function getSessionUser(
  c: Context,
  secret: string,
): Promise<{ id: string; name: string; sessionId: string } | null> {
  const token = getCookie(c, "session")
  if (!token) return null
  const payload = await verify(token, secret)
  if (!payload) return null
  return { id: payload.userId, name: payload.name, sessionId: payload.sessionId }
}

export async function getValidatedSessionUser(
  c: Context,
  db: D1Database,
  secret: string,
): Promise<{ id: string; name: string } | null> {
  const user = await getSessionUser(c, secret)
  if (!user) return null

  const row = await db
    .prepare(
      "SELECT id FROM sessions WHERE id = ? AND user_id = ? AND expires_at > datetime('now')",
    )
    .bind(user.sessionId, user.id)
    .first()

  if (!row) return null
  return { id: user.id, name: user.name }
}

export async function getUserId(
  c: Context,
  db: D1Database,
  secret: string,
): Promise<string | null> {
  const user = await getValidatedSessionUser(c, db, secret)
  return user?.id ?? null
}

export const requireAuth = createMiddleware<{
  Bindings: { DB: D1Database; SESSION_SECRET: string }
  Variables: { user: { id: string; name: string } }
}>(async (c, next) => {
  const user = await getValidatedSessionUser(c, c.env.DB, c.env.SESSION_SECRET)
  if (!user) {
    return c.json({ error: msg(c, "auth.not_logged_in") }, 401)
  }
  c.set("user", user)
  await next()
})
