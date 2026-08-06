import { Hono } from "hono"
import type { Bindings } from ".."
import type {
  SearchContentItem,
  SearchContentPage,
  SearchContentResponse,
  SearchScope,
} from "@index/shared"
import { buildFtsQuery, makeSnippet } from "@index/shared"
import { AppError } from "../lib/error"

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 50
const PAGES_PER_MATERIAL = 3
const SNIPPET_WIDTH = 90

const app = new Hono<{ Bindings: Bindings }>()

app.use("/search", async (c, next) => {
  const limiter = c.env.SEARCH_RATE_LIMITER
  if (!limiter) return next()
  const key = c.req.header("cf-connecting-ip") ?? "unknown"
  const { success } = await limiter.limit({ key })
  if (!success) throw new AppError(429, "error.rate_limited")
  return next()
})

function parseScope(raw: string | undefined): SearchScope {
  if (raw === "subject" || raw === "material") return raw
  return "global"
}

function parseLimit(raw: string | undefined): number {
  if (!raw) return DEFAULT_LIMIT
  const v = Number(raw)
  if (!Number.isFinite(v)) return DEFAULT_LIMIT
  return Math.min(Math.max(Math.round(v), 1), MAX_LIMIT)
}

function parseOffset(raw: string | undefined): number {
  if (!raw) return 0
  const v = Number(raw)
  return Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0
}

function buildFilter(
  scope: SearchScope,
  subjectId: string | undefined,
  materialId: string | undefined,
  includeOcr: boolean,
): { sql: string; params: string[] } {
  const parts: string[] = []
  const params: string[] = []
  if (!includeOcr) parts.push("source = 'pdf'")
  if (scope === "subject") {
    parts.push("material_id IN (SELECT id FROM materials WHERE subject_id = ?)")
    params.push(subjectId!)
  } else if (scope === "material") {
    parts.push("material_id = ?")
    params.push(materialId!)
  }
  return {
    sql: parts.length ? ` AND ${parts.join(" AND ")}` : "",
    params,
  }
}

function emptyResponse(): SearchContentResponse {
  return { content: { total: 0, hasMore: false, items: [] } }
}

app.get("/search", async (c) => {
  const rawQuery = c.req.query("q") ?? ""
  const ftsQuery = buildFtsQuery(rawQuery)
  if (!ftsQuery) return c.json(emptyResponse(), 200)

  const scope = parseScope(c.req.query("scope"))
  const subjectId = c.req.query("subjectId") ?? undefined
  const materialId = c.req.query("materialId") ?? undefined
  if (scope === "subject" && !subjectId) throw new AppError(400, "search.invalid")
  if (scope === "material" && !materialId) throw new AppError(400, "search.invalid")

  const includeOcr = c.req.query("includeOcr") === "1"
  const limit = parseLimit(c.req.query("limit"))
  const offset = parseOffset(c.req.query("offset"))
  const filter = buildFilter(scope, subjectId, materialId, includeOcr)
  const db = c.env.DB

  const ftsMatch =
    "WITH ranked AS MATERIALIZED (\n" +
    "  SELECT material_id, bm25(material_pages_fts) AS rnk\n" +
    "  FROM material_pages_fts\n" +
    "  WHERE material_pages_fts MATCH ?" +
    filter.sql +
    "\n)"

  const pageQuery =
    ftsMatch +
    "\nSELECT material_id, MIN(rnk) AS best_rank, COUNT(*) AS hits\n" +
    "FROM ranked\n" +
    "GROUP BY material_id\n" +
    "ORDER BY best_rank, material_id\n" +
    "LIMIT ? OFFSET ?"

  const countQuery = ftsMatch + "\nSELECT COUNT(DISTINCT material_id) AS total FROM ranked"

  const [pageRows, countRows] = await Promise.all([
    db
      .prepare(pageQuery)
      .bind(ftsQuery, ...filter.params, limit, offset)
      .all(),
    db
      .prepare(countQuery)
      .bind(ftsQuery, ...filter.params)
      .all(),
  ])

  const total = (countRows.results[0]?.total as number) ?? 0
  const aggRows = pageRows.results as Array<{
    material_id: string
    best_rank: number
    hits: number
  }>

  if (aggRows.length === 0) return c.json(emptyResponse(), 200)
  const hasMore = offset + aggRows.length < total

  const ids = aggRows.map((r) => r.material_id)
  const idPlaceholders = ids.map(() => "?").join(", ")

  const windowQuery =
    "WITH ranked AS MATERIALIZED (\n" +
    "  SELECT material_id, page_number, orig, bm25(material_pages_fts) AS rnk\n" +
    "  FROM material_pages_fts\n" +
    "  WHERE material_pages_fts MATCH ?" +
    filter.sql +
    ` AND material_id IN (${idPlaceholders})\n)` +
    "\nSELECT material_id, page_number, orig\n" +
    "FROM (\n" +
    "  SELECT material_id, page_number, orig,\n" +
    "         ROW_NUMBER() OVER (PARTITION BY material_id ORDER BY rnk, page_number) AS rn\n" +
    "  FROM ranked\n" +
    `) WHERE rn <= ${PAGES_PER_MATERIAL}\n` +
    "ORDER BY material_id, rn"

  const metaQuery =
    `SELECT m.id, m.subject_id, m.title, m.file_type, s.name AS subject_name\n` +
    `FROM materials m JOIN subjects s ON s.id = m.subject_id\n` +
    `WHERE m.id IN (${idPlaceholders})`

  const [windowRows, metaRows] = await Promise.all([
    db
      .prepare(windowQuery)
      .bind(ftsQuery, ...filter.params, ...ids)
      .all(),
    db
      .prepare(metaQuery)
      .bind(...ids)
      .all(),
  ])

  const metaById = new Map<string, (typeof metaRows.results)[number]>()
  for (const row of metaRows.results) metaById.set(row.id as string, row)

  const pagesByMaterial = new Map<string, SearchContentPage[]>()
  for (const row of windowRows.results as Array<{
    material_id: string
    page_number: number
    orig: string
  }>) {
    const list = pagesByMaterial.get(row.material_id) ?? []
    if (list.length >= PAGES_PER_MATERIAL) continue
    list.push({ page: row.page_number, snippet: makeSnippet(row.orig, rawQuery, SNIPPET_WIDTH) })
    pagesByMaterial.set(row.material_id, list)
  }

  const items: SearchContentItem[] = aggRows.map((row) => {
    const meta = metaById.get(row.material_id)
    return {
      materialId: row.material_id,
      subjectId: (meta?.subject_id as string) ?? "",
      subjectName: (meta?.subject_name as string) ?? "",
      title: (meta?.title as string) ?? "",
      fileType: ((meta?.file_type as string) ?? "pdf") as SearchContentItem["fileType"],
      hits: row.hits,
      pages: pagesByMaterial.get(row.material_id) ?? [],
    }
  })

  return c.json({ content: { total, hasMore, items } } satisfies SearchContentResponse, 200)
})

export default app
