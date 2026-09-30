#!/usr/bin/env node
// Indexes PDF text into the material_pages_fts FTS5 table (§4.2 of search-plan).
//
// Mirrors seed-local-r2.mjs: everything goes through the wrangler CLI, so no
// Cloudflare SDK is needed. Per material the DELETE + INSERTs + page_count
// UPDATE are sent as ONE multi-statement D1 query, which D1 executes atomically
// (verified), so a crash mid-material leaves the previous state intact, never a
// partial page set. A material is appended to .wrangler/index.done only after
// its batch commits, so interrupted runs are re-picked-up on the next run.
//
// Requires Node >= 22.18 (type stripping is default-on): @index/shared has no
// build step (its exports point at TypeScript source), so this script loads
// the shared normalize helpers as raw .ts, exactly like every other consumer
// in the repo (Vite and wrangler strip types during bundling; plain Node here
// does it natively). The import goes through the @index/shared/normalize
// subpath rather than the package root because the root entry (index.ts) uses
// extensionless relative imports, which bundlers resolve but plain Node ESM
// cannot; normalize.ts is a self-contained leaf with no imports of its own.
//
// Usage:
//   node scripts/index-pdfs.mjs --local    # dev: read local D1 + local R2
//   node scripts/index-pdfs.mjs --remote   # prod: read remote D1 + remote R2
//   node scripts/index-pdfs.mjs --local --force   # full rebuild (ignores done file)
import { spawnSync } from "node:child_process"
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs"
import { normalizeSr, repairDiacritics } from "@index/shared/normalize"

const WORKER_DIR = fileURLToPath(new URL("..", import.meta.url))
const API_PREFIX = "/api/file/"
// Repo-pinned wrangler: system binaries differ in local-state behavior.
const WRANGLER = join(WORKER_DIR, "..", "..", "node_modules", ".bin", "wrangler")

const args = process.argv.slice(2)
const envFlag = args.includes("--remote") ? "--remote" : "--local"
const envName = envFlag === "--remote" ? "remote" : "local"
const force = args.includes("--force")
// Progress is tracked per environment: local and remote runs must not share
// a done file, or the second env silently skips everything as done.
const DONE_FILE = join(WORKER_DIR, ".wrangler", `index.${envName}.done`)

function run(cmd, cmdArgs, opts = {}) {
  const res = spawnSync(cmd, cmdArgs, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    cwd: WORKER_DIR,
    ...opts,
  })
  if (res.status !== 0) {
    throw new Error(`${cmd} ${cmdArgs.join(" ")} failed: ${res.stderr?.slice(0, 800)}`)
  }
  return res.stdout
}

function d1Query(sql) {
  const out = run(WRANGLER, ["d1", "execute", "index-db", envFlag, "--json", "--command", sql])
  return JSON.parse(out.slice(out.indexOf("[")))
}

function d1Batch(sql) {
  const tmpDir = mkdtempSync(join(tmpdir(), "index-batch-"))
  writeFileSync(join(tmpDir, "batch.sql"), sql)
  try {
    return run(WRANGLER, [
      "d1",
      "execute",
      "index-db",
      envFlag,
      "--json",
      "--file",
      join(tmpDir, "batch.sql"),
    ])
  } finally {
    rmSync(tmpDir, { recursive: true, force: true })
  }
}

function fetchMaterials() {
  const parsed = d1Query(
    "SELECT id, url, file_type FROM materials WHERE file_type IN ('pdf', 'text', 'html') ORDER BY id",
  )
  return parsed
    .flatMap((r) => r.results ?? [])
    .filter((r) => typeof r.url === "string" && r.url.startsWith(API_PREFIX))
    .map((r) => ({ id: r.id, key: r.url.slice(API_PREFIX.length), fileType: r.file_type }))
}

function doneKeys() {
  if (force) return new Set()
  try {
    return new Set(readFileSync(DONE_FILE, "utf8").split("\n").filter(Boolean))
  } catch {
    return new Set()
  }
}

function markDone(id) {
  mkdirSync(dirname(DONE_FILE), { recursive: true })
  writeFileSync(DONE_FILE, `${id}\n`, { flag: "a" })
}

async function extractPages(pdfPath) {
  const data = new Uint8Array(readFileSync(pdfPath))
  const doc = await getDocument({ data }).promise
  const pages = []
  let repairedPages = 0
  try {
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
      const page = await doc.getPage(pageNumber)
      try {
        const content = await page.getTextContent()
        let raw = ""
        for (const item of content.items) {
          if (typeof item.str === "string") {
            raw += item.str + (item.hasEOL ? "\n" : " ")
          }
        }
        const orig = repairDiacritics(raw)
        if (orig !== raw) repairedPages++
        pages.push({ pageNumber, orig, text: normalizeSr(orig) })
      } finally {
        page.cleanup()
      }
    }
  } finally {
    await doc.destroy()
  }
  return { pages, repairedPages }
}

// Deliberately NOT parameterized: the batch is executed via
// `wrangler d1 execute --file`, which has no support for bound parameters.
// This is safe because the input is trusted (the script's own PDF corpus,
// never user-supplied strings); escaping quotes and stripping control chars is
// a defensive floor on top of that, not the primary defense.
function sqlValue(s) {
  return s.replace(/'/g, "''").replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, " ")
}

function buildBatchSql(id, pages, source) {
  const lines = [`DELETE FROM material_pages_fts WHERE material_id = '${id}'`]
  for (const p of pages) {
    lines.push(
      `INSERT INTO material_pages_fts (text, orig, material_id, page_number, source) VALUES ('${sqlValue(p.text)}', '${sqlValue(p.orig)}', '${id}', ${p.pageNumber}, '${source}')`,
    )
  }
  lines.push(`UPDATE materials SET page_count = ${pages.length} WHERE id = '${id}'`)
  return lines.join(";\n") + ";"
}

// Plain text materials (sql, txt) index as fixed line windows so in-material
// find can jump to a chunk the same way it jumps to a PDF page.
const TEXT_LINES_PER_PAGE = 120
// Stored HTML (notebooks, slides) indexes as character windows of visible
// text: scripts, styles, and tags stripped, entities decoded. Same chunk
// shape as everything else, source tells them apart at query time.
const HTML_CHARS_PER_PAGE = 1500

const HTML_ENTITIES = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
}

function extractHtmlPages(filePath) {
  const raw = readFileSync(filePath, "utf8")
  const noScripts = raw
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
  const text = noScripts
    .replace(/<[^>]+>/g, " ")
    .replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (_, name) => HTML_ENTITIES[name])
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, " ")
    .trim()
  const pages = []
  for (let i = 0; i < text.length; i += HTML_CHARS_PER_PAGE) {
    const orig = text.slice(i, i + HTML_CHARS_PER_PAGE)
    pages.push({ pageNumber: pages.length + 1, orig, text: normalizeSr(orig) })
  }
  if (pages.length === 0) pages.push({ pageNumber: 1, orig: "", text: "" })
  return pages
}

function extractTextPages(filePath) {
  const repaired = repairDiacritics(readFileSync(filePath, "utf8"))
  const lines = repaired.split("\n")
  const pages = []
  for (let i = 0; i < lines.length; i += TEXT_LINES_PER_PAGE) {
    const orig = lines.slice(i, i + TEXT_LINES_PER_PAGE).join("\n")
    pages.push({ pageNumber: pages.length + 1, orig, text: normalizeSr(orig) })
  }
  if (pages.length === 0) pages.push({ pageNumber: 1, orig: "", text: "" })
  return pages
}

async function main() {
  mkdirSync(dirname(DONE_FILE), { recursive: true })
  const done = doneKeys()
  const materials = fetchMaterials()
  const tmpDir = mkdtempSync(join(tmpdir(), "index-pdfs-"))
  let indexed = 0
  let skipped = 0
  let totalRepairs = 0
  let repairedMaterials = 0
  const failed = []

  for (const material of materials) {
    if (done.has(material.id)) {
      skipped++
      continue
    }
    const pdfPath = join(tmpDir, "material.pdf")
    try {
      run(WRANGLER, ["r2", "object", "get", `index-bucket/${material.key}`, envFlag, "-f", pdfPath])
      let pages
      let source
      let repairNote = ""
      if (material.fileType === "text") {
        pages = extractTextPages(pdfPath)
        source = "text"
      } else if (material.fileType === "html") {
        pages = extractHtmlPages(pdfPath)
        source = "html"
      } else {
        const extracted = await extractPages(pdfPath)
        pages = extracted.pages
        source = "pdf"
        if (extracted.repairedPages > 0) {
          totalRepairs += extracted.repairedPages
          repairedMaterials++
          repairNote = `, repair: ${extracted.repairedPages}/${pages.length}`
        }
      }
      d1Batch(buildBatchSql(material.id, pages, source))
      markDone(material.id)
      indexed++
      console.log(`✓ ${material.id} (${pages.length} pages${repairNote})`)
    } catch (err) {
      const message = err.message.split("\n")[0]
      failed.push({ id: material.id, message })
      const hint =
        envName === "local" && /does not exist|not exist/i.test(message)
          ? " (run `pnpm seed:r2` first to sync the corpus into the local bucket)"
          : ""
      console.error(`✗ ${material.id}: ${message}${hint}`)
    }
  }

  rmSync(tmpDir, { recursive: true, force: true })

  const repairSummary =
    totalRepairs > 0
      ? ` · repaired text in ${repairedMaterials} materials (${totalRepairs} pages)`
      : ""
  console.log(
    `\nDone: ${indexed} indexed, ${skipped} already indexed, ${failed.length} failed${repairSummary}`,
  )
  if (failed.length > 0) {
    console.error("Failed:\n" + failed.map((f) => `${f.id}: ${f.message}`).join("\n"))
    process.exitCode = 1
  }
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
