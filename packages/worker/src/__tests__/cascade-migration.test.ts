import { describe, it, expect, beforeAll } from "vitest"
import { env } from "cloudflare:workers"
import { runMigrations, statements } from "./helpers"
import cascadeSql from "../../migrations/0004_user_cascade.sql?raw"

const DB = (env as unknown as { DB: import("@cloudflare/workers-types").D1Database }).DB

describe("0004_user_cascade migration", () => {
  beforeAll(async () => {
    await runMigrations()
    await DB.exec(statements(cascadeSql))
  })

  it("rebuilds user-linked tables with ON DELETE CASCADE on user_id", async () => {
    const rows = await DB.prepare(
      "SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name IN ('sessions', 'bookmarks', 'preferences', 'visit_history')",
    ).all<{ name: string; sql: string }>()
    const byName = new Map(rows.results.map((r) => [r.name, r.sql]))
    for (const name of ["sessions", "bookmarks", "preferences", "visit_history"]) {
      const sql = byName.get(name) ?? ""
      expect(sql).toContain("REFERENCES users(id) ON DELETE CASCADE")
    }
  })

  it("preserves existing data and indexes", async () => {
    const count = await DB.prepare("SELECT COUNT(*) AS n FROM bookmarks").first<{ n: number }>()
    expect(count?.n).toBe(0)
    const indexes = await DB.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'index' AND name IN ('idx_sessions_user_id', 'idx_sessions_expires_at', 'idx_bookmarks_user_id', 'idx_bookmarks_material_id', 'idx_visit_history_user_material', 'idx_visit_history_user_visited')",
    ).all<{ name: string }>()
    expect(indexes.results).toHaveLength(6)
  })

  it("cascades a user delete through its sessions, bookmarks and visit history", async () => {
    const userId = "cascade-user"
    await DB.batch([
      DB.prepare("INSERT INTO users (id, name, password_hash) VALUES (?, 'cascade', 'x')").bind(
        userId,
      ),
      DB.prepare(
        "INSERT INTO sessions (id, user_id, expires_at) VALUES ('s1', ?, '2099-01-01')",
      ).bind(userId),
      DB.prepare(
        "INSERT INTO bookmarks (id, user_id, material_id) VALUES ('b1', ?, 'ma2-k1-kolokvijum-2015-11-15')",
      ).bind(userId),
      DB.prepare(
        "INSERT INTO visit_history (id, user_id, material_id) VALUES ('v1', ?, 'ma2-k1-kolokvijum-2015-11-15')",
      ).bind(userId),
    ])
    await DB.exec("PRAGMA foreign_keys = ON")
    await DB.batch([DB.prepare("DELETE FROM users WHERE id = ?").bind(userId)])

    const remaining = await DB.batch([
      DB.prepare("SELECT COUNT(*) AS n FROM sessions WHERE user_id = ?").bind(userId),
      DB.prepare("SELECT COUNT(*) AS n FROM bookmarks WHERE user_id = ?").bind(userId),
      DB.prepare("SELECT COUNT(*) AS n FROM visit_history WHERE user_id = ?").bind(userId),
    ])
    for (const r of remaining) {
      expect((r.results[0] as { n: number }).n).toBe(0)
    }
    await DB.exec("PRAGMA foreign_keys = OFF")
  })
})
