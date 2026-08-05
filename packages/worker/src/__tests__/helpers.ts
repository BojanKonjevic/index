import { env } from "cloudflare:workers"

const db = (env as unknown as { DB: import("@cloudflare/workers-types").D1Database }).DB

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
  `CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires_at TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)`,
  `CREATE TABLE IF NOT EXISTS bookmarks (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), material_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
  `CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_bookmarks_material_id ON bookmarks(material_id)`,
  `CREATE TABLE IF NOT EXISTS preferences (user_id TEXT PRIMARY KEY REFERENCES users(id), group_number TEXT, updated_at TEXT NOT NULL DEFAULT (datetime('now')))`,
  `CREATE TABLE IF NOT EXISTS subjects (id TEXT PRIMARY KEY, name TEXT NOT NULL, semester INTEGER NOT NULL, espb INTEGER NOT NULL, elective INTEGER NOT NULL DEFAULT 0, elective_group TEXT, description TEXT NOT NULL DEFAULT '', professors TEXT NOT NULL DEFAULT '[]', assistants TEXT NOT NULL DEFAULT '[]', created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
  `CREATE TABLE IF NOT EXISTS materials (id TEXT PRIMARY KEY, subject_id TEXT NOT NULL REFERENCES subjects(id), title TEXT NOT NULL, category TEXT NOT NULL, exam_part TEXT, solved INTEGER, file_type TEXT NOT NULL, url TEXT NOT NULL, page_count INTEGER NOT NULL DEFAULT 0, tags TEXT NOT NULL DEFAULT '[]', created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
  `CREATE INDEX IF NOT EXISTS idx_materials_subject_id ON materials(subject_id)`,
  `CREATE TABLE IF NOT EXISTS exams (id TEXT PRIMARY KEY, subject_id TEXT NOT NULL REFERENCES subjects(id), title TEXT NOT NULL, date TEXT NOT NULL, time TEXT NOT NULL DEFAULT '', location TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
  `CREATE INDEX IF NOT EXISTS idx_exams_subject_id ON exams(subject_id)`,
  `CREATE TABLE IF NOT EXISTS material_assets (id TEXT PRIMARY KEY, material_id TEXT NOT NULL REFERENCES materials(id) ON DELETE CASCADE, page_number INTEGER NOT NULL, name TEXT NOT NULL DEFAULT '', file_type TEXT NOT NULL DEFAULT 'image', url TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
  `CREATE INDEX IF NOT EXISTS idx_material_assets_material_id ON material_assets(material_id)`,
  `CREATE TABLE IF NOT EXISTS visit_history (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), material_id TEXT NOT NULL, visited_at TEXT NOT NULL DEFAULT (datetime('now')))`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_visit_history_user_material ON visit_history(user_id, material_id)`,
  `CREATE INDEX IF NOT EXISTS idx_visit_history_user_visited ON visit_history(user_id, visited_at DESC)`,
]

export async function runMigrations() {
  const stmts = SCHEMA_STATEMENTS.map((sql) => db.prepare(sql))
  await db.batch(stmts)
}

export async function seedSubject() {
  await db.batch([
    db.prepare(
      `INSERT OR IGNORE INTO subjects (id, name, semester, espb, elective, description, professors, assistants) VALUES ('matematicka-analiza-2', 'Matematička analiza 2', 4, 8, 0, 'Funkcije više promenljivih.', '[]', '[]')`,
    ),
    db.prepare(
      `INSERT OR IGNORE INTO materials (id, subject_id, title, category, exam_part, solved, file_type, url) VALUES ('ma2-k1-kolokvijum-2015-11-15', 'matematicka-analiza-2', 'K1 Kolokvijum 2015 11 15', 'exam', 'K1', NULL, 'pdf', '/api/file/test.pdf')`,
    ),
    db.prepare(
      `INSERT OR IGNORE INTO materials (id, subject_id, title, category, exam_part, solved, file_type, url) VALUES ('ma2-vezbe-01', 'matematicka-analiza-2', 'Vežbe 01', 'problems', NULL, NULL, 'pdf', '/api/file/test.pdf')`,
    ),
    db.prepare(
      `INSERT OR IGNORE INTO material_assets (id, material_id, page_number, name, file_type, url) VALUES ('asset-001', 'ma2-k1-kolokvijum-2015-11-15', 1, 'Strana 1', 'image', '/api/file/1.jpg')`,
    ),
  ])
}

export async function seedExam() {
  await db
    .prepare(
      `INSERT OR IGNORE INTO exams (id, subject_id, title, date, time, location) VALUES ('exam-test-1', 'matematicka-analiza-2', 'Test ispit', date('now', '+7 days'), '09:00', 'A1')`,
    )
    .run()
}
