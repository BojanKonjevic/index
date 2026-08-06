import { describe, it, expect, beforeAll } from "vitest"
import { env, exports } from "cloudflare:workers"
import { runMigrations, seedSubject } from "./helpers"
import searchSql from "../../migrations/0003_search.sql?raw"

type Worker = {
  fetch: (url: string | Request, init?: RequestInit) => Promise<Response>
}
const SELF = (exports as unknown as { default: Worker }).default

type SearchItem = {
  materialId: string
  subjectId: string
  subjectName: string
  title: string
  fileType: string
  hits: number
  pages: Array<{ page: number; snippet: string }>
}

type SearchContent = {
  content: {
    total: number
    hasMore: boolean
    items: SearchItem[]
  }
}

const DB = (env as unknown as { DB: import("@cloudflare/workers-types").D1Database }).DB

const mA = "ma2-k1-kolokvijum-2015-11-15"
const mB = "ma2-vezbe-01"
const mC = "fizika-skripta"
const SUBJECT_A = "matematicka-analiza-2"
const SUBJECT_C = "fizika"

function ftsRow(materialId: string, page: number, text: string, orig: string, source = "pdf") {
  return DB.prepare(
    "INSERT INTO material_pages_fts (text, orig, material_id, page_number, source) VALUES (?, ?, ?, ?, ?)",
  ).bind(text, orig, materialId, page, source)
}

function statements(sql: string): string {
  return sql
    .split(/;\r?\n/)
    .map((s) => s.replace(/\s*\r?\n\s*/g, " ").trim())
    .filter(Boolean)
    .join("\n")
}

async function seedSearch() {
  await DB.batch([
    DB.prepare(
      `INSERT OR IGNORE INTO subjects (id, name, semester, espb, elective, description, professors, assistants) VALUES ('${SUBJECT_C}', 'Fizika', 2, 3, 0, 'Mehanika i toplota.', '[]', '[]')`,
    ),
    DB.prepare(
      `INSERT OR IGNORE INTO materials (id, subject_id, title, category, exam_part, solved, file_type, url, page_count, tags) VALUES ('${mC}', '${SUBJECT_C}', 'Skripta iz fizike', 'theory', NULL, NULL, 'pdf', '/api/file/fizika-skripta.pdf', 0, '[]')`,
    ),
  ])

  const rows = [
    ftsRow(mA, 1, "resenje a b c d e", "Rešenje a b c d e"),
    ftsRow(
      mA,
      2,
      "resenje m resenje n resenje o resenje p resenje q resenje r resenje s",
      "Rešenje m rešenje n rešenje o rešenje p rešenje q rešenje r rešenje s",
    ),
    ftsRow(mA, 3, "resenje h i j k l m n o", "Rešenje h i j k l m n o"),
    ftsRow(
      mA,
      4,
      "resenje " + "slaba strana ".repeat(120),
      "Rešenje " + "slaba strana ".repeat(120),
    ),
    ftsRow(mA, 99, "resenje ocr", "Rešenje ocr", "ocr"),
    ftsRow(mA, 5, "loran grad", "Loran grad"),
    ftsRow(mB, 1, "resenje konturu", "Rešenje konturu"),
    ftsRow(mB, 2, "resenje konturu", "Rešenje konturu"),
    ftsRow(mB, 3, "resenje konturu", "Rešenje konturu"),
    ftsRow(mB, 9, "loran gradu", "Loran gradu"),
    ftsRow(mC, 1, "resenje fizicke", "Rešenje fizicke"),
    ftsRow(mC, 2, "resenje toplotte", "Rešenje toplotte"),
    ftsRow(mC, 3, "resenje mehanike", "Rešenje mehanike"),
  ]
  await DB.batch(rows)
}

async function search(
  params: Record<string, string>,
): Promise<{ status: number; body: SearchContent }> {
  const qs = new URLSearchParams(Object.entries(params))
  const res = await SELF.fetch(`http://localhost/api/search?${qs}`)
  return { status: res.status, body: (await res.json()) as SearchContent }
}

describe("GET /api/search", () => {
  beforeAll(async () => {
    await runMigrations()
    await DB.exec(statements(searchSql))
    await seedSubject()
    await seedSearch()
  })

  it("returns an empty result for a non-meaningful query", async () => {
    for (const q of ["", "???", "l", "   "]) {
      const { status, body } = await search({ q })
      expect(status).toBe(200)
      expect(body.content.total).toBe(0)
      expect(body.content.items).toEqual([])
    }
  })

  it("aggregates page hits per material at global scope", async () => {
    const { status, body } = await search({ q: "resenje" })
    expect(status).toBe(200)
    expect(body.content.total).toBe(3)

    const byId = new Map(body.content.items.map((i) => [i.materialId, i]))
    expect(byId.get(mA)).toBeDefined()
    expect(byId.get(mB)).toBeDefined()
    expect(byId.get(mC)).toBeDefined()

    const itemA = byId.get(mA)!
    expect(itemA.hits).toBe(4) // pages 1..4; the ocr page is excluded by default
    expect(itemA.subjectId).toBe(SUBJECT_A)
    expect(itemA.subjectName).toBe("Matematička analiza 2")
    expect(itemA.fileType).toBe("pdf")
    expect(itemA.pages).toHaveLength(3)
    const pagesOfA = itemA.pages.map((p) => p.page)
    expect(pagesOfA).toContain(2)
    expect(pagesOfA).not.toContain(4) // the padded weak page is outside the top 3
  })

  it("ranks a material with a strong match above ones with weak matches", async () => {
    const { body } = await search({ q: "resenje" })
    // mA has a page where "resenje" appears 7 times, so its best page outranks
    // every single-occurrence page in mB/mC.
    expect(body.content.items[0].materialId).toBe(mA)
  })

  it("returns up to 3 snippet pages per material", async () => {
    const { body } = await search({ q: "resenje", scope: "material", materialId: mB })
    const item = body.content.items[0]
    expect(item.hits).toBe(3)
    expect(item.pages).toHaveLength(3)
  })

  it("scopes results to a subject", async () => {
    const { body } = await search({ q: "resenje", scope: "subject", subjectId: SUBJECT_A })
    const ids = body.content.items.map((i) => i.materialId)
    expect(ids).toContain(mA)
    expect(ids).toContain(mB)
    expect(ids).not.toContain(mC)
  })

  it("scopes results to a single material", async () => {
    const { body } = await search({ q: "resenje", scope: "material", materialId: mC })
    expect(body.content.items).toHaveLength(1)
    expect(body.content.items[0].materialId).toBe(mC)
  })

  it("rejects a scope that is missing its id", async () => {
    const { status } = await search({ q: "resenje", scope: "subject" })
    expect(status).toBe(400)
  })

  it("excludes ocr rows by default and includes them when requested", async () => {
    const without = await search({ q: "resenje", scope: "material", materialId: mA })
    expect(without.body.content.items[0].hits).toBe(4)

    const withOcr = await search({
      q: "resenje",
      scope: "material",
      materialId: mA,
      includeOcr: "1",
    })
    expect(withOcr.body.content.items[0].hits).toBe(5) // page 99 becomes visible
  })

  it("matches Cyrillic input and highlights matches in snippets", async () => {
    const { body } = await search({ q: "Лоран", scope: "material", materialId: mB })
    expect(body.content.items).toHaveLength(1)
    const hit = body.content.items[0]
    expect(hit.hits).toBe(1)
    expect(hit.pages[0].snippet).toContain("<mark>")
  })

  it("paginates materials and reports hasMore honestly", async () => {
    const first = await search({ q: "resenje", limit: "1", offset: "0" })
    expect(first.body.content.items).toHaveLength(1)
    expect(first.body.content.total).toBe(3)
    expect(first.body.content.hasMore).toBe(true)

    const next = await search({ q: "resenje", limit: "1", offset: "1" })
    expect(next.body.content.items).toHaveLength(1)
    expect(next.body.content.hasMore).toBe(true)

    const last = await search({ q: "resenje", limit: "10", offset: "2" })
    expect(last.body.content.items).toHaveLength(1)
    expect(last.body.content.hasMore).toBe(false)
  })

  it("clamps the limit parameter", async () => {
    const { body } = await search({ q: "resenje", limit: "999" })
    expect(body.content.items.length).toBeLessThanOrEqual(50)
  })

  it("keeps every material when a word matches thousands of pages", async () => {
    const values = Array.from({ length: 500 }, (_, i) => {
      const pageNumber = 1000 + i
      return `('resenje ponoavljanje', 'Rešenje ponoavljanje', '${mA}', ${pageNumber}, 'pdf')`
    }).join(", ")
    await DB.prepare(
      `INSERT INTO material_pages_fts (text, orig, material_id, page_number, source) VALUES ${values}`,
    ).run()

    const { body } = await search({ q: "resenje" })
    expect(body.content.total).toBe(3)
    const ids = body.content.items.map((i) => i.materialId)
    expect(ids).toContain(mA)
    expect(ids).toContain(mB)
    expect(ids).toContain(mC)
    expect(body.content.items.find((i) => i.materialId === mA)!.hits).toBeGreaterThanOrEqual(500)
  })
})

type SearchPages = {
  total: number
  pages: Array<{ page: number; count: number }>
}

async function searchPages(
  params: Record<string, string>,
): Promise<{ status: number; body: SearchPages }> {
  const qs = new URLSearchParams(Object.entries(params))
  const res = await SELF.fetch(`http://localhost/api/search/pages?${qs}`)
  return { status: res.status, body: (await res.json()) as SearchPages }
}

describe("GET /api/search/pages", () => {
  beforeAll(async () => {
    await DB.prepare("DELETE FROM material_pages_fts WHERE page_number >= 1000").run()
  })

  it("returns per-page occurrence counts for one material", async () => {
    const { status, body } = await searchPages({ q: "resenje", materialId: mA })
    expect(status).toBe(200)
    expect(body.total).toBe(10) // pages 1(1) + 2(7) + 3(1) + 4(1); ocr page 99 excluded
    expect(body.pages.map((p) => p.page).sort((a, b) => a - b)).toEqual([1, 2, 3, 4])
    expect(body.pages.find((p) => p.page === 2)?.count).toBe(7)
    expect(body.pages.find((p) => p.page === 4)?.count).toBe(1)
  })

  it("orders pages ascending by page number", async () => {
    const { body } = await searchPages({ q: "resenje", materialId: mA })
    expect(body.pages[0].page).toBe(1)
    expect(body.pages.map((p) => p.page)).toEqual([1, 2, 3, 4])
  })

  it("includes ocr pages when requested", async () => {
    const { body } = await searchPages({ q: "resenje", materialId: mA, includeOcr: "1" })
    expect(body.total).toBe(11)
    expect(body.pages.some((p) => p.page === 99)).toBe(true)
  })

  it("returns empty for a material without matches", async () => {
    const { status, body } = await searchPages({ q: "nepostojeci", materialId: mA })
    expect(status).toBe(200)
    expect(body.total).toBe(0)
    expect(body.pages).toEqual([])
  })

  it("rejects a missing materialId", async () => {
    const { status } = await searchPages({ q: "resenje" })
    expect(status).toBe(400)
  })
})
