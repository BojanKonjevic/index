import { Hono } from "hono"
import { msg } from "../lib/i18n"
import { getValidatedSessionUser } from "../lib/session"
import {
  addBookmarkSchema,
  removeBookmarkSchema,
  updatePreferencesSchema,
} from "@index/shared/schemas"
import { mapMaterial } from "../lib/db"

const app = new Hono<{ Bindings: { DB: D1Database; SESSION_SECRET: string } }>()

app.get("/bookmarks/materials", async (c) => {
  const user = await getValidatedSessionUser(c, c.env.DB, c.env.SESSION_SECRET)
  if (!user) return c.json({ materials: [], subjectNameMap: {} })

  const rows = await c.env.DB.prepare(
    "SELECT m.*, s.name as subject_name, (SELECT COUNT(*) FROM material_assets WHERE material_id = m.id) as asset_count FROM bookmarks b JOIN materials m ON m.id = b.material_id JOIN subjects s ON s.id = m.subject_id WHERE b.user_id = ? ORDER BY m.title",
  )
    .bind(user.id)
    .all<Record<string, unknown>>()

  const materials = rows.results.map(mapMaterial)
  const subjectNameMap: Record<string, string> = {}
  for (const row of rows.results) {
    subjectNameMap[row.subject_id as string] = row.subject_name as string
  }

  return c.json({ materials, subjectNameMap })
})

app.get("/bookmarks", async (c) => {
  const user = await getValidatedSessionUser(c, c.env.DB, c.env.SESSION_SECRET)
  if (!user) return c.json({ error: msg(c, "auth.not_logged_in") }, 401)

  const rows = await c.env.DB.prepare("SELECT material_id FROM bookmarks WHERE user_id = ?")
    .bind(user.id)
    .all<{ material_id: string }>()

  return c.json({ ids: rows.results.map((r) => r.material_id) })
})

app.post("/bookmarks/add", async (c) => {
  const user = await getValidatedSessionUser(c, c.env.DB, c.env.SESSION_SECRET)
  if (!user) return c.json({ error: msg(c, "auth.not_logged_in") }, 401)

  const raw = await c.req.json()
  const parsed = addBookmarkSchema.safeParse(raw)
  if (!parsed.success) return c.json({ error: msg(c, "auth.material_id_required") }, 400)
  const { materialId } = parsed.data

  const id = crypto.randomUUID()
  await c.env.DB.prepare(
    "INSERT OR IGNORE INTO bookmarks (id, user_id, material_id) VALUES (?, ?, ?)",
  )
    .bind(id, user.id, materialId)
    .run()

  return c.json({ ok: true })
})

app.post("/bookmarks/remove", async (c) => {
  const user = await getValidatedSessionUser(c, c.env.DB, c.env.SESSION_SECRET)
  if (!user) return c.json({ error: msg(c, "auth.not_logged_in") }, 401)

  const raw = await c.req.json()
  const parsed = removeBookmarkSchema.safeParse(raw)
  if (!parsed.success) return c.json({ error: msg(c, "auth.material_id_required") }, 400)
  const { materialId } = parsed.data
  await c.env.DB.prepare("DELETE FROM bookmarks WHERE user_id = ? AND material_id = ?")
    .bind(user.id, materialId)
    .run()

  return c.json({ ok: true })
})

app.get("/preferences", async (c) => {
  const user = await getValidatedSessionUser(c, c.env.DB, c.env.SESSION_SECRET)
  if (!user) return c.json({ error: msg(c, "auth.not_logged_in") }, 401)

  const row = await c.env.DB.prepare("SELECT group_number FROM preferences WHERE user_id = ?")
    .bind(user.id)
    .first<{ group_number: string }>()

  return c.json({ group: row?.group_number ?? null })
})

app.put("/preferences", async (c) => {
  const user = await getValidatedSessionUser(c, c.env.DB, c.env.SESSION_SECRET)
  if (!user) return c.json({ error: msg(c, "auth.not_logged_in") }, 401)

  const raw = await c.req.json()
  const parsed = updatePreferencesSchema.safeParse(raw)
  if (!parsed.success) return c.json({ error: msg(c, "auth.material_id_required") }, 400)
  const { group } = parsed.data

  await c.env.DB.prepare(
    `INSERT INTO preferences (user_id, group_number, updated_at)
       VALUES (?, ?, datetime('now'))
       ON CONFLICT(user_id) DO UPDATE SET group_number = ?, updated_at = datetime('now')`,
  )
    .bind(user.id, group, group)
    .run()

  return c.json({ ok: true })
})

export default app
