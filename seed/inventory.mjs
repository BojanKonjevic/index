#!/usr/bin/env node
// Inventory a drive dump for seeding. Read only, never modifies the dump.
// Usage: node inventory.mjs <dump-dir> [-json <out-path>]
// Stdout carries the human table. -json writes the full machine record
// (round state, keep it outside the repo, /tmp is fine).
// Grouping assumes <dump>/<semester>/<subject>/... layout. Files directly
// under <dump> land in the (root) group.
import { createHash } from "node:crypto"
import { readdirSync, statSync, readFileSync, writeFileSync } from "node:fs"
import { join, relative, sep } from "node:path"

const JUNK_DIRS = new Set([
  "obj",
  "bin",
  "debug",
  "release",
  ".git",
  ".idea",
  ".vs",
  "__pycache__",
  "__macosx",
  ".vscode",
  "test-results",
  "node_modules",
])
const JUNK_FILES = new Set([".ds_store", "thumbs.db"])
const JUNK_EXTS = new Set([
  "pyc",
  "dll",
  "exe",
  "baml",
  "cache",
  "pdb",
  "suo",
  "vsidx",
  "dtbcache",
  "futdcache",
  "lref",
  "ilk",
  "obj",
  "tlog",
  "lastbuildstate",
])

function isJunk(relPath) {
  const parts = relPath.split(sep)
  const base = parts[parts.length - 1].toLowerCase()
  if (base.startsWith("._") || JUNK_FILES.has(base)) return true
  const dot = base.lastIndexOf(".")
  if (dot > 0 && JUNK_EXTS.has(base.slice(dot + 1))) return true
  for (const part of parts.slice(0, -1)) {
    if (JUNK_DIRS.has(part.toLowerCase())) return true
  }
  return false
}

function walk(dir, out) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (readdirSync(full).length === 0) out.emptyDirs.push(relative(out.root, full))
      else walk(full, out)
    } else if (entry.isFile()) {
      out.files.push(full)
    }
  }
}

function sha256(path) {
  const hash = createHash("sha256")
  hash.update(readFileSync(path))
  return hash.digest("hex").slice(0, 16)
}

function main() {
  const args = process.argv.slice(2)
  const root = args[0]
  const jsonIdx = args.indexOf("-json")
  const jsonPath = jsonIdx >= 0 ? args[jsonIdx + 1] : null
  if (!root) {
    console.error("usage: node inventory.mjs <dump-dir> [-json <out-path>]")
    process.exit(1)
  }

  const ctx = { root, files: [], emptyDirs: [] }
  walk(root, ctx)

  const subjects = {}
  function groupOf(rel) {
    const parts = rel.split(sep)
    if (parts.length < 3) return "(root)"
    return parts[0] + " / " + parts[1]
  }
  for (const full of ctx.files) {
    const rel = relative(root, full)
    const group = groupOf(rel)
    const s = (subjects[group] = subjects[group] || {
      files: 0,
      bytes: 0,
      junk: 0,
      exts: {},
      nonAscii: 0,
      maxDepth: 0,
      hashes: {},
    })
    const stat = statSync(full)
    const junk = isJunk(rel)
    const base = rel.split(sep).pop()
    const dot = base.lastIndexOf(".")
    const ext = dot > 0 ? base.slice(dot + 1).toLowerCase() : "(no ext)"
    s.files++
    s.bytes += stat.size
    if (junk) s.junk++
    s.exts[ext] = (s.exts[ext] || 0) + 1
    if (/[^\x00-\x7F]/.test(rel)) s.nonAscii++
    s.maxDepth = Math.max(s.maxDepth, rel.split(sep).length)
    if (!junk) {
      try {
        const h = sha256(full)
        ;(s.hashes[h] = s.hashes[h] || []).push(rel)
      } catch {
        /* unreadable, verify stage will catch it */
      }
    }
  }

  const lines = []
  for (const [name, s] of Object.entries(subjects).sort()) {
    const mb = (s.bytes / 1048576).toFixed(1)
    lines.push(
      `== ${name} ==  files=${s.files} junk=${s.junk} size=${mb}MB nonAscii=${s.nonAscii} maxDepth=${s.maxDepth}`,
    )
    const top = Object.entries(s.exts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
    lines.push("   types: " + top.map(([e, n]) => `${e}:${n}`).join(" "))
    const dups = Object.values(s.hashes).filter((g) => g.length > 1)
    if (dups.length > 0) {
      lines.push(`   dupGroups=${dups.length} dupFiles=${dups.reduce((n, g) => n + g.length, 0)}`)
      for (const g of dups.slice(0, 5)) lines.push("     - " + g.join(" | "))
      if (dups.length > 5) lines.push(`     ... and ${dups.length - 5} more groups`)
    }
  }
  if (ctx.emptyDirs.length > 0) {
    lines.push(`emptyDirs=${ctx.emptyDirs.length}: ` + ctx.emptyDirs.slice(0, 10).join(" | "))
  }
  console.log(lines.join("\n"))

  if (jsonPath) {
    const record = { root, groups: {} }
    for (const [name, s] of Object.entries(subjects)) {
      record.groups[name] = {
        files: s.files,
        bytes: s.bytes,
        junk: s.junk,
        exts: s.exts,
        nonAscii: s.nonAscii,
        maxDepth: s.maxDepth,
        dupGroups: Object.values(s.hashes).filter((g) => g.length > 1),
      }
    }
    record.emptyDirs = ctx.emptyDirs
    writeFileSync(jsonPath, JSON.stringify(record, null, 2))
    console.error(`machine record at ${jsonPath}`)
  }
}

main()
