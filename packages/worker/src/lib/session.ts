import type { Context } from "hono"
import { setCookie, getCookie, deleteCookie } from "hono/cookie"

interface SessionPayload {
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
  userId: string,
  name: string,
  secret: string,
) {
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  const payload: SessionPayload = { userId, name, expiresAt }
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
): Promise<{ id: string; name: string } | null> {
  const token = getCookie(c, "session")
  if (!token) return null
  const payload = await verify(token, secret)
  if (!payload) return null
  return { id: payload.userId, name: payload.name }
}

export async function getUserId(c: Context, secret: string): Promise<string | null> {
  const user = await getSessionUser(c, secret)
  return user?.id ?? null
}
