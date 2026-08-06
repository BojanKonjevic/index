#!/usr/bin/env node
// Indexes PDF text into the material_pages_fts FTS5 table (§4.2 of search-plan).
//
// Mirrors seed-local-r2.mjs: everything goes through the wrangler CLI, so no
// Cloudflare SDK is needed. Per material the DELETE + INSERTs + page_count
// UPDATE are sent as ONE multi-statement D1 query, which D1 executes atomically
// (verified) — a crash mid-material leaves the previous state intact, never a
// partial page set. A material is appended to .wrangler/index.done only after
// its batch commits, so interrupted runs are re-picked-up on the next run.
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
import { normalizeSr, repairDiacritics } from "../../shared/src/normalize.ts"

const WORKER_DIR = fileURLToPath(new URL("..", import.meta.url))
const API_PREFIX = "/api/file/"
const DONE_FILE = join(WORKER_DIR, ".wrangler", "index.done")

const args = process.argv.slice(2)
const envFlag = args.includes("--remote") ? "--remote" : "--local"
const envName = envFlag === "--remote" ? "remote" : "local"
const force = args.includes("--force")

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
  const out = run("wrangler", ["d1", "execute", "index-db", envFlag, "--json", "--command", sql])
  return JSON.parse(out.slice(out.indexOf("[")))
}

function d1Batch(sql) {
  const tmpDir = mkdtempSync(join(tmpdir(), "index-batch-"))
  writeFileSync(join(tmpDir, "batch.sql"), sql)
  try {
    return run("wrangler", [
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
  const parsed = d1Query("SELECT id, url FROM materials WHERE file_type = 'pdf' ORDER BY id")
  return parsed
    .flatMap((r) => r.results ?? [])
    .filter((r) => typeof r.url === "string" && r.url.startsWith(API_PREFIX))
    .map((r) => ({ id: r.id, key: r.url.slice(API_PREFIX.length) }))
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

function sqlValue(s) {
  return s.replace(/'/g, "''").replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, " ")
}

function buildBatchSql(id, pages) {
  const lines = [`DELETE FROM material_pages_fts WHERE material_id = '${id}'`]
  for (const p of pages) {
    lines.push(
      `INSERT INTO material_pages_fts (text, orig, material_id, page_number, source) VALUES ('${sqlValue(p.text)}', '${sqlValue(p.orig)}', '${id}', ${p.pageNumber}, 'pdf')`,
    )
  }
  lines.push(`UPDATE materials SET page_count = ${pages.length} WHERE id = '${id}'`)
  return lines.join(";\n") + ";"
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
      run("wrangler", [
        "r2",
        "object",
        "get",
        `index-bucket/${material.key}`,
        envFlag,
        "-f",
        pdfPath,
      ])
      const { pages, repairedPages } = await extractPages(pdfPath)
      d1Batch(buildBatchSql(material.id, pages))
      markDone(material.id)
      indexed++
      if (repairedPages > 0) {
        totalRepairs += repairedPages
        repairedMaterials++
      }
      const repairNote = repairedPages > 0 ? `, repair: ${repairedPages}/${pages.length}` : ""
      console.log(`✓ ${material.id} (${pages.length} pages${repairNote})`)
    } catch (err) {
      const message = err.message.split("\n")[0]
      failed.push({ id: material.id, message })
      const hint =
        envName === "local" && /does not exist|not exist/i.test(message)
          ? " — run `pnpm seed:r2` first to sync the corpus into the local bucket"
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
