import { env } from "cloudflare:workers"
import initialSql from "../../migrations/0001_initial.sql?raw"
import seedSql from "../../migrations/0002_seed_data.sql?raw"

const db = (env as unknown as { DB: import("@cloudflare/workers-types").D1Database }).DB

let migrated = false

export async function runMigrations() {
  if (migrated) return
  migrated = true
  await db.exec(statements(initialSql))
  await db.exec(statements(seedSql))
}

function statements(sql: string) {
  return sql
    .split(/;\r?\n/)
    .map((s) => s.replace(/\s*\r?\n\s*/g, " ").trim())
    .filter(Boolean)
    .join("\n")
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
