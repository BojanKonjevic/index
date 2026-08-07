import { describe, it, expect, beforeAll } from "vitest"
import { exports, env } from "cloudflare:workers"
import { runMigrations, seedSubject } from "./helpers"
import searchSql from "../../migrations/0003_search.sql?raw"
import type { OfflineSubjectPayload } from "@index/shared"

type Worker = {
  fetch: (url: string | Request, init?: RequestInit) => Promise<Response>
}
const SELF = (exports as unknown as { default: Worker }).default

const db = (env as unknown as { DB: import("@cloudflare/workers-types").D1Database }).DB

function statements(sql: string): string {
  return sql
    .split(/;\r?\n/)
    .map((s) => s.replace(/\s*\r?\n\s*/g, " ").trim())
    .filter(Boolean)
    .join("\n")
}

async function seedPageRows() {
  await db
    .prepare(
      "DELETE FROM material_pages_fts WHERE material_id IN ('ma2-vezbe-01', 'ma2-k1-kolokvijum-2015-11-15')",
    )
    .run()
  await db.batch([
    db.prepare(
      `INSERT INTO material_pages_fts (text, orig, material_id, page_number, source) VALUES ('veze prvog reda zadatak jedan', 'Vežbe prvog reda: zadatak 1.', 'ma2-vezbe-01', 1, 'pdf')`,
    ),
    db.prepare(
      `INSERT INTO material_pages_fts (text, orig, material_id, page_number, source) VALUES ('veze prvog reda zadatak dva', 'Vežbe prvog reda: zadatak 2.', 'ma2-vezbe-01', 2, 'pdf')`,
    ),
    db.prepare(
      `INSERT INTO material_pages_fts (text, orig, material_id, page_number, source) VALUES ('kolokvijum prvi zadatak', 'K1 kolokvijum: zadatak 1.', 'ma2-k1-kolokvijum-2015-11-15', 1, 'pdf')`,
    ),
    db.prepare(
      `INSERT INTO material_pages_fts (text, orig, material_id, page_number, source) VALUES ('ocr recenski tekst', 'OCR tekst koji se ne izvozi.', 'ma2-vezbe-01', 3, 'ocr')`,
    ),
  ])
}

beforeAll(async () => {
  await runMigrations()
  await db.exec(statements(searchSql))
  await seedSubject()
  await seedPageRows()
})

describe("GET /api/offline/subject/:id", () => {
  it("returns subject, materials with assets and pdf page text", async () => {
    const res = await SELF.fetch("http://localhost/api/offline/subject/matematicka-analiza-2")
    expect(res.status).toBe(200)
    const body = (await res.json()) as OfflineSubjectPayload

    expect(body.subject.id).toBe("matematicka-analiza-2")
    expect(body.subject.name).toBe("Matematička analiza 2")
    expect(body.materialCount).toBe(body.materials.length)
    expect(body.revision).toMatch(/^\d+:/)

    expect(body.materials).toHaveLength(body.materialCount)
    const exam = body.materials.find((m) => m.id === "ma2-k1-kolokvijum-2015-11-15")!
    expect(exam.category).toBe("exam")
    expect(exam.assets.some((a) => a.url === "/api/file/1.jpg")).toBe(true)

    expect(body.pages).toHaveLength(3)
    const vezbePages = body.pages.filter((p) => p.materialId === "ma2-vezbe-01")
    expect(vezbePages.map((p) => p.pageNumber)).toEqual([1, 2])
    expect(vezbePages[0].text).toBe("Vežbe prvog reda: zadatak 1.")
  })

  it("excludes ocr-sourced page text", async () => {
    const res = await SELF.fetch("http://localhost/api/offline/subject/matematicka-analiza-2")
    const body = (await res.json()) as OfflineSubjectPayload
    expect(body.pages.some((p) => p.text.includes("OCR"))).toBe(false)
  })

  it("returns 404 for unknown subject", async () => {
    const res = await SELF.fetch("http://localhost/api/offline/subject/nonexistent")
    expect(res.status).toBe(404)
  })

  it("serves the bundle as plain json (no content-encoding)", async () => {
    const res = await SELF.fetch("http://localhost/api/offline/subject/matematicka-analiza-2", {
      headers: { "Accept-Encoding": "gzip" },
    })
    expect(res.status).toBe(200)
    expect(res.headers.get("content-encoding")).toBeNull()

    const body = (await res.json()) as OfflineSubjectPayload
    expect(body.subject.id).toBe("matematicka-analiza-2")
    expect(body.pages).toHaveLength(3)
  })
})
