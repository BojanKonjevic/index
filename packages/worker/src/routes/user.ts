import { Hono } from "hono"
import { bodyLimit } from "hono/body-limit"
import { getValidatedSessionUser, requireAuth } from "../lib/session"
import { AppError } from "../lib/error"
import {
  addBookmarkSchema,
  addHistorySchema,
  removeBookmarkSchema,
  updatePreferencesSchema,
} from "@index/shared/schemas"
import { mapMaterial } from "../lib/db"

type AppVariables = { user: { id: string; name: string } }

const app = new Hono<{
  Bindings: { DB: D1Database; SESSION_SECRET: string }
  Variables: AppVariables
}>()

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

app.get("/bookmarks", requireAuth, async (c) => {
  const user = c.get("user")
  const rows = await c.env.DB.prepare("SELECT material_id FROM bookmarks WHERE user_id = ?")
    .bind(user.id)
    .all<{ material_id: string }>()

  return c.json({ ids: rows.results.map((r) => r.material_id) })
})

app.post("/bookmarks/add", bodyLimit({ maxSize: 1024 * 10 }), requireAuth, async (c) => {
  const user = c.get("user")
  const raw = await c.req.json()
  const parsed = addBookmarkSchema.safeParse(raw)
  if (!parsed.success) throw new AppError(400, "auth.material_id_required")
  const { materialId } = parsed.data

  const id = crypto.randomUUID()
  await c.env.DB.prepare(
    "INSERT OR IGNORE INTO bookmarks (id, user_id, material_id) VALUES (?, ?, ?)",
  )
    .bind(id, user.id, materialId)
    .run()

  return c.json({ ok: true })
})

app.post("/bookmarks/remove", bodyLimit({ maxSize: 1024 * 10 }), requireAuth, async (c) => {
  const user = c.get("user")
  const raw = await c.req.json()
  const parsed = removeBookmarkSchema.safeParse(raw)
  if (!parsed.success) throw new AppError(400, "auth.material_id_required")
  const { materialId } = parsed.data
  await c.env.DB.prepare("DELETE FROM bookmarks WHERE user_id = ? AND material_id = ?")
    .bind(user.id, materialId)
    .run()

  return c.json({ ok: true })
})

app.get("/history", requireAuth, async (c) => {
  const user = c.get("user")
  const rows = await c.env.DB.prepare(
    `SELECT vh.visited_at, m.*, s.name as subject_name,
            (SELECT COUNT(*) FROM material_assets WHERE material_id = m.id) as asset_count
     FROM visit_history vh
     JOIN materials m ON m.id = vh.material_id
     JOIN subjects s ON s.id = m.subject_id
     WHERE vh.user_id = ?
     ORDER BY vh.visited_at DESC
     LIMIT 50`,
  )
    .bind(user.id)
    .all<Record<string, unknown>>()

  const items = rows.results.map((r) => {
    const m = mapMaterial(r)
    return {
      materialId: m.id,
      subjectId: m.subjectId,
      title: m.title,
      subjectName: r.subject_name as string,
      fileType: m.fileType,
      category: m.category,
      examPart: m.examPart,
      solved: m.solved,
      assetCount: m.assetCount ?? 0,
      timestamp: new Date(r.visited_at as string).getTime(),
    }
  })

  return c.json({ items })
})

app.post("/history", bodyLimit({ maxSize: 1024 * 10 }), requireAuth, async (c) => {
  const user = c.get("user")
  const raw = await c.req.json()
  const parsed = addHistorySchema.safeParse(raw)
  if (!parsed.success) throw new AppError(400, "auth.material_id_required")
  const { materialId } = parsed.data

  const id = crypto.randomUUID()
  await c.env.DB.prepare(
    `INSERT INTO visit_history (id, user_id, material_id, visited_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(user_id, material_id) DO UPDATE SET visited_at = datetime('now')`,
  )
    .bind(id, user.id, materialId)
    .run()

  return c.json({ ok: true })
})

app.get("/preferences", requireAuth, async (c) => {
  const user = c.get("user")
  const row = await c.env.DB.prepare("SELECT group_number FROM preferences WHERE user_id = ?")
    .bind(user.id)
    .first<{ group_number: string }>()

  return c.json({ group: row?.group_number ?? null })
})

app.put("/preferences", bodyLimit({ maxSize: 1024 * 10 }), requireAuth, async (c) => {
  const user = c.get("user")
  const raw = await c.req.json()
  const parsed = updatePreferencesSchema.safeParse(raw)
  if (!parsed.success) throw new AppError(400, "preferences.invalid")
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
