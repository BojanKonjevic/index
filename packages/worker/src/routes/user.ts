import { Hono } from "hono"
import { msg } from "../lib/i18n"
import { getUserId } from "../lib/session"

const app = new Hono<{ Bindings: { DB: D1Database; SESSION_SECRET: string } }>()

app.get("/bookmarks", async (c) => {
  const userId = await getUserId(c, c.env.DB, c.env.SESSION_SECRET)
  if (!userId) return c.json({ error: msg(c, "auth.not_logged_in") }, 401)

  const rows = await c.env.DB.prepare("SELECT material_id FROM bookmarks WHERE user_id = ?")
    .bind(userId)
    .all<{ material_id: string }>()

  return c.json({ ids: rows.results.map((r) => r.material_id) })
})

app.post("/bookmarks/add", async (c) => {
  const userId = await getUserId(c, c.env.DB, c.env.SESSION_SECRET)
  if (!userId) return c.json({ error: msg(c, "auth.not_logged_in") }, 401)

  const { materialId } = await c.req.json()
  if (!materialId) return c.json({ error: msg(c, "auth.material_id_required") }, 400)

  const id = crypto.randomUUID()
  await c.env.DB.prepare(
    "INSERT OR IGNORE INTO bookmarks (id, user_id, material_id) VALUES (?, ?, ?)",
  )
    .bind(id, userId, materialId)
    .run()

  return c.json({ ok: true })
})

app.post("/bookmarks/remove", async (c) => {
  const userId = await getUserId(c, c.env.DB, c.env.SESSION_SECRET)
  if (!userId) return c.json({ error: msg(c, "auth.not_logged_in") }, 401)

  const { materialId } = await c.req.json()
  await c.env.DB.prepare("DELETE FROM bookmarks WHERE user_id = ? AND material_id = ?")
    .bind(userId, materialId)
    .run()

  return c.json({ ok: true })
})

app.get("/preferences", async (c) => {
  const userId = await getUserId(c, c.env.DB, c.env.SESSION_SECRET)
  if (!userId) return c.json({ error: msg(c, "auth.not_logged_in") }, 401)

  const row = await c.env.DB.prepare("SELECT group_number FROM preferences WHERE user_id = ?")
    .bind(userId)
    .first<{ group_number: string }>()

  return c.json({ group: row?.group_number ?? null })
})

app.put("/preferences", async (c) => {
  const userId = await getUserId(c, c.env.DB, c.env.SESSION_SECRET)
  if (!userId) return c.json({ error: msg(c, "auth.not_logged_in") }, 401)

  const { group } = await c.req.json()

  await c.env.DB.prepare(
    `INSERT INTO preferences (user_id, group_number, updated_at)
       VALUES (?, ?, datetime('now'))
       ON CONFLICT(user_id) DO UPDATE SET group_number = ?, updated_at = datetime('now')`,
  )
    .bind(userId, group, group)
    .run()

  return c.json({ ok: true })
})

export default app
