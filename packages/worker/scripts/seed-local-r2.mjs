// Syncs remote R2 objects into the local dev bucket.
// Note: materials.page_count is no longer left at 0; scripts/index-pdfs.mjs
// writes real page counts when it indexes each material's text.
import { spawnSync } from "node:child_process"
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const API_PREFIX = "/api/file/"
const DONE_FILE = ".wrangler/r2-seed.done"

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...opts })
  if (res.status !== 0) {
    throw new Error(`${cmd} ${args.join(" ")} failed: ${res.stderr?.slice(0, 500)}`)
  }
  return res.stdout
}

function localKeys() {
  const out = run("wrangler", [
    "d1",
    "execute",
    "index-db",
    "--local",
    "--json",
    "--command",
    "SELECT url FROM materials UNION SELECT url FROM material_assets",
  ])
  const jsonStart = out.indexOf("[")
  const parsed = JSON.parse(out.slice(jsonStart))
  const urls = parsed.flatMap((r) => r.results ?? []).map((r) => r.url)
  return [
    ...new Set(urls.filter((u) => u.startsWith(API_PREFIX)).map((u) => u.slice(API_PREFIX.length))),
  ]
}

function doneKeys() {
  try {
    return new Set(readFileSync(DONE_FILE, "utf8").split("\n").filter(Boolean))
  } catch {
    return new Set()
  }
}

const tmpDir = mkdtempSync(join(tmpdir(), "r2-seed-"))
mkdirSync(".wrangler", { recursive: true })
let synced = 0
let skipped = 0
let failed = []

try {
  const done = doneKeys()
  const keys = localKeys()

  for (const key of keys) {
    if (done.has(key)) {
      skipped++
      continue
    }
    const tmpFile = join(tmpDir, "object.bin")
    try {
      run("wrangler", ["r2", "object", "get", `index-bucket/${key}`, "--remote", "-f", tmpFile])
      run("wrangler", ["r2", "object", "put", `index-bucket/${key}`, "--local", "-f", tmpFile])
      writeFileSync(DONE_FILE, `${key}\n`, { flag: "a" })
      synced++
      console.log(`✓ ${key}`)
    } catch (err) {
      failed.push(key)
      console.error(`✗ ${key}: ${err.message}`)
    }
  }
} finally {
  rmSync(tmpDir, { recursive: true, force: true })
}

console.log(`\nDone: ${synced} synced, ${skipped} already present, ${failed.length} failed`)
if (failed.length > 0) {
  console.error("Failed keys:\n" + failed.join("\n"))
  process.exitCode = 1
}
