#!/usr/bin/env node
// Uploads files to R2 from a manifest. Round manifests stay outside the repo.
// Usage: node upload-r2.mjs <manifest.json> [-remote-only | -local-only] [--no-strip]
// Manifest: [{ "file": "/abs/path.pdf", "key": "subject/Group/slug.pdf" }]
// Default uploads to remote first, then local. Reports per file, exits
// nonzero if any upload fails.
//
// Seed guarantee: every .pdf passes through strip-annotations.mjs first so
// no Highlight annotation ever ships (RULES.md 14). The check byte-scans
// and skips clean files in milliseconds; only files carrying the marker
// pay for a parse. --no-strip escapes for emergencies, say so in chat when
// it is used.
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { WRANGLER, run } from "./lib/run.mjs"

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
const stripScript = join(dirname(fileURLToPath(import.meta.url)), "strip-annotations.mjs")
const skipStrip = args.includes("--no-strip")
if (skipStrip) {
  console.error("WARNING: --no-strip skips the Highlight-strip gate, the upload is unchecked")
}
let ok = 0
const failed = []
for (const { file, key } of entries) {
  // Keys are backend identifiers: ascii slugs only. Non-ASCII or spaced
  // keys corrupt the local toolchain (percent-encoded on write, read back
  // raw) and fail local verification. Natural names belong in titles.
  if (/[^\x20-\x7e]/.test(key) || key !== key.normalize("NFC")) {
    failed.push(`(rejected) ${key}`)
    console.error(`X (rejected, non-ascii key) ${key}`)
    continue
  }
  if (/\s/.test(key)) {
    failed.push(`(rejected) ${key}`)
    console.error(`X (rejected, whitespace in key) ${key}`)
    continue
  }
  if (!skipStrip && key.toLowerCase().endsWith(".pdf")) {
    try {
      run(process.execPath, [stripScript, "--files", file], { cwd: process.cwd() })
    } catch (err) {
      failed.push(`(strip) ${key}`)
      console.error(`X (strip failed, not uploading) ${key}: ${String(err.message).slice(0, 200)}`)
      continue
    }
  }
  for (const target of targets) {
    try {
      run(WRANGLER, ["r2", "object", "put", `index-bucket/${key}`, target, "-f", file])
    } catch (err) {
      failed.push(`${target} ${key}`)
      console.error(`X ${target} ${key}: ${String(err.message).slice(0, 200)}`)
    }
  }
  if (!failed.some((f) => f.endsWith(key))) {
    ok++
    console.log(`ok ${key}`)
  }
}
console.log(`\nDone: ${ok} uploaded, ${failed.length} failed`)
if (failed.length > 0) process.exit(1)
