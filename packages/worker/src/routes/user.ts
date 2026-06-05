import { Hono } from "hono"
import { getCookie } from "hono/cookie"

async function getUserId(db: D1Database, sessionId: string | undefined): Promise<string | null> {
  if (!sessionId) return null
  const row = await db
    .prepare("SELECT user_id FROM sessions WHERE id = ? AND expires_at > datetime('now')")
    .bind(sessionId)
    .first<{ user_id: string }>()
  return row?.user_id ?? null
}

const app = new Hono<{ Bindings: { DB: D1Database } }>()

app.get("/bookmarks", async (c) => {
  const userId = await getUserId(c.env.DB, getCookie(c, "session"))
  if (!userId) return c.json({ error: "Niste prijavljeni." }, 401)

  const rows = await c.env.DB.prepare("SELECT material_id FROM bookmarks WHERE user_id = ?")
    .bind(userId)
    .all<{ material_id: string }>()

  return c.json({ ids: rows.results.map((r) => r.material_id) })
})

app.post("/bookmarks/add", async (c) => {
  const userId = await getUserId(c.env.DB, getCookie(c, "session"))
  if (!userId) return c.json({ error: "Niste prijavljeni." }, 401)

  const { materialId } = await c.req.json()
  if (!materialId) return c.json({ error: "ID materijala je obavezan." }, 400)

  const id = crypto.randomUUID()
  await c.env.DB.prepare(
    "INSERT OR IGNORE INTO bookmarks (id, user_id, material_id) VALUES (?, ?, ?)",
  )
    .bind(id, userId, materialId)
    .run()

  return c.json({ ok: true })
})

app.post("/bookmarks/remove", async (c) => {
  const userId = await getUserId(c.env.DB, getCookie(c, "session"))
  if (!userId) return c.json({ error: "Niste prijavljeni." }, 401)

  const { materialId } = await c.req.json()
  await c.env.DB.prepare("DELETE FROM bookmarks WHERE user_id = ? AND material_id = ?")
    .bind(userId, materialId)
    .run()

  return c.json({ ok: true })
})

app.get("/preferences", async (c) => {
  const userId = await getUserId(c.env.DB, getCookie(c, "session"))
  if (!userId) return c.json({ error: "Niste prijavljeni." }, 401)

  const row = await c.env.DB.prepare("SELECT group_number FROM preferences WHERE user_id = ?")
    .bind(userId)
    .first<{ group_number: string }>()

  return c.json({ group: row?.group_number ?? null })
})

app.put("/preferences", async (c) => {
  const userId = await getUserId(c.env.DB, getCookie(c, "session"))
  if (!userId) return c.json({ error: "Niste prijavljeni." }, 401)

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

app.post("/sync", async (c) => {
  const userId = await getUserId(c.env.DB, getCookie(c, "session"))
  if (!userId) return c.json({ error: "Niste prijavljeni." }, 401)

  const { bookmarks, group } = await c.req.json()

  if (Array.isArray(bookmarks) && bookmarks.length > 0) {
    const stmts = bookmarks.map((materialId: string) =>
      c.env.DB.prepare(
        "INSERT OR IGNORE INTO bookmarks (id, user_id, material_id) VALUES (?, ?, ?)",
      ).bind(crypto.randomUUID(), userId, materialId),
    )
    await c.env.DB.batch(stmts)
  }

  if (group) {
    await c.env.DB.prepare(
      `INSERT INTO preferences (user_id, group_number, updated_at)
         VALUES (?, ?, datetime('now'))
         ON CONFLICT(user_id) DO UPDATE SET group_number = ?, updated_at = datetime('now')`,
    )
      .bind(userId, group, group)
      .run()
  }

  return c.json({ ok: true })
})

export default app
