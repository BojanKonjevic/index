#!/usr/bin/env node
// Uploads files to R2 from a manifest. Round manifests stay outside the repo.
// Usage: node upload-r2.mjs <manifest.json> [-remote-only | -local-only]
// Manifest: [{ "file": "/abs/path.pdf", "key": "subject/Group/slug.pdf" }]
// Default uploads to remote first, then local. Reports per file, exits
// nonzero if any upload fails.
import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

// Wrangler resolves local state (R2 buckets, D1) relative to the cwd, so
// every invocation must run from the worker dir. Running from anywhere else
// silently writes to a stray .wrangler folder and later reads miss.
const WORKER_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "packages", "worker")
// The repo-pinned wrangler, never whatever happens to be on PATH: system
// wranglers differ in version and local-state behavior (4.126 corrupts fresh
// local D1 state, all tested versions mangle non-ASCII keys in local R2).
const ROOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..")
const WRANGLER = join(ROOT_DIR, "node_modules", ".bin", "wrangler")

const args = process.argv.slice(2)
const manifestPath = args[0]
if (!manifestPath) {
  console.error("usage: node upload-r2.mjs <manifest.json> [-remote-only | -local-only]")
  process.exit(1)
}
const targets = args.includes("-remote-only")
  ? ["--remote"]
  : args.includes("-local-only")
    ? ["--local"]
    : ["--remote", "--local"]

const entries = JSON.parse(readFileSync(manifestPath, "utf8"))
let ok = 0
const failed = []
for (const { file, key } of entries) {
  for (const target of targets) {
    const res = spawnSync(
      WRANGLER,
      ["r2", "object", "put", `index-bucket/${key}`, target, "-f", file],
      {
        encoding: "utf8",
        cwd: WORKER_DIR,
      },
    )
    if (res.status !== 0) {
      failed.push(`${target} ${key}`)
      console.error(`X ${target} ${key}: ${(res.stderr || "").slice(0, 200)}`)
    }
  }
  if (!failed.some((f) => f.endsWith(key))) {
    ok++
    console.log(`ok ${key}`)
  }
}
console.log(`\nDone: ${ok} uploaded, ${failed.length} failed`)
if (failed.length > 0) process.exit(1)
