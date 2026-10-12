#!/usr/bin/env node
// Strips PDF markup-ink annotations (author study markup) from R2 objects
// or local staging files, then verifies every touched file parses with
// zero strippable annots left and an unchanged page count. See seed/RULES.md
// ("PDF markup annotations are junk").
//
// Usage:
//   node strip-annotations.mjs --r2 [--remote-only | --local-only] [--keys k1,k2]
//   node strip-annotations.mjs --r2 --verify-only [--remote-only | --local-only]
//   node strip-annotations.mjs --files a.pdf b.pdf [--verify-only]
//
// --r2 processes every .pdf key served from R2 (materials plus assets, read
// from D1). Anything that fails to parse, verify, or upload is reported and
// exits nonzero; failed files are never uploaded. No backups: the drive
// dump is the source of truth, stripping runs at seed time.
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { PDFDocument, PDFArray, PDFName, PDFRef } from "pdf-lib"
import { WRANGLER, run } from "./lib/run.mjs"

const API_PREFIX = "/api/file/"

const args = process.argv.slice(2)
const modeR2 = args.includes("--r2")
const modeFiles = args.includes("--files")
const verifyOnly = args.includes("--verify-only")
const targets = args.includes("--remote-only")
  ? ["--remote"]
  : args.includes("--local-only")
    ? ["--local"]
    : ["--remote", "--local"]
const keysFlag = args.find((a) => a.startsWith("--keys="))
const onlyKeys = keysFlag
  ? new Set(keysFlag.slice("--keys=".length).split(",").filter(Boolean))
  : null
const fileArgs = modeFiles
  ? args.slice(args.indexOf("--files") + 1).filter((a) => !a.startsWith("--"))
  : []

if (!modeR2 && !modeFiles) {
  console.error(
    "usage: node strip-annotations.mjs --r2 [--verify-only] | --files a.pdf [...] [--verify-only]",
  )
  process.exit(1)
}

function pdfKeys(target) {
  const out = run(WRANGLER, [
    "d1",
    "execute",
    "index-db",
    target,
    "--json",
    "--command",
    "SELECT url FROM materials UNION SELECT url FROM material_assets",
  ])
  const parsed = JSON.parse(out.slice(out.indexOf("[")))
  const urls = parsed.flatMap((r) => r.results ?? []).map((r) => r.url)
  const keys = [
    ...new Set(
      urls
        .filter((u) => u.startsWith(API_PREFIX) && u.toLowerCase().endsWith(".pdf"))
        .map((u) => u.slice(API_PREFIX.length)),
    ),
  ].sort()
  return onlyKeys ? keys.filter((k) => onlyKeys.has(k)) : keys
}

function subtypeOf(context, refOrObj) {
  const obj = refOrObj instanceof PDFRef ? context.lookup(refOrObj) : refOrObj
  if (!obj || typeof obj.lookup !== "function") return null
  const subtype = obj.lookup(PDFName.of("Subtype"))
  if (!subtype || typeof subtype.toString !== "function") return null
  const text = subtype.toString()
  return text.startsWith("/") ? text.slice(1) : text
}

function contentsOf(context, refOrObj) {
  try {
    const obj = refOrObj instanceof PDFRef ? context.lookup(refOrObj) : refOrObj
    const contents = obj?.lookup?.(PDFName.of("Contents"))
    if (!contents) return ""
    if (typeof contents.decodeText === "function") return contents.decodeText()
    if (contents instanceof PDFArray) {
      return contents
        .asArray()
        .map((el) => (typeof el?.decodeText === "function" ? el.decodeText() : ""))
        .join("")
    }
  } catch {
    /* unreadable contents count as empty */
  }
  return ""
}

function annotsArray(page) {
  const raw = page.node.get(PDFName.of("Annots"))
  if (!raw) return null
  const arr = raw instanceof PDFRef ? page.node.context.lookup(raw) : raw
  return arr instanceof PDFArray ? arr : null
}

/** Fast negative: annotation dicts name their /Annots array and /Subtype
 *  literally, so bytes without any of those markers cannot contain
 *  strippable markup and skip the full parse. Compressed object streams
 *  (/ObjStm) and cross-reference streams (/XRef) can hide names, so their
 *  markers force the full parse too. The reverse is not assumed (content
 *  streams can mention the strings), a hit always falls through to the
 *  real scan. Zero-copy Buffer matching keeps the common clean-file case
 *  to milliseconds. Markers derive from STRIP_SUBTYPES below plus the
 *  structural names, so the two lists cannot drift. */
const EXTRA_MARKERS = ["/Annots", "/ObjStm", "/XRef"]
function bytesCouldContainMarkup(bytes) {
  const buf = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes)
  if (EXTRA_MARKERS.some((marker) => buf.includes(marker))) return true
  return [...STRIP_SUBTYPES].some((subtype) => buf.includes(`/${subtype}`))
}

/** Markup-ink subtypes: visible additions on top of the document with no
 *  reader function. Functional subtypes (Link, Widget, FileAttachment,
 *  Sound, Movie, Screen) stay: links drive navigation, attachments are
 *  content. Text and Popup notes stay when they carry text (information),
 *  and go when empty (invisible shells). */
const STRIP_SUBTYPES = new Set([
  "Highlight",
  "Underline",
  "Squiggly",
  "StrikeOut",
  "Caret",
  "Ink",
  "Stamp",
  "FreeText",
])

function isStrippedSubtype(subtype, context, ref) {
  if (STRIP_SUBTYPES.has(subtype)) return true
  if ((subtype === "Text" || subtype === "Popup") && contentsOf(context, ref).trim().length === 0) {
    return true
  }
  return false
}

/** Inspects annotations in one parse: per-subtype counts plus how many
 *  annots stripAnnotations would remove. One load serves scan, strip
 *  decision, and report, instead of parsing the file three times. */
async function inspectAnnotations(bytes) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const context = doc.context
  const counts = {}
  let pages = 0
  let strippable = 0
  for (const page of doc.getPages()) {
    pages++
    const annots = annotsArray(page)
    if (!annots) continue
    for (const ref of annots.asArray()) {
      const subtype = subtypeOf(context, ref) ?? "?"
      counts[subtype] = (counts[subtype] ?? 0) + 1
      if (isStrippedSubtype(subtype, context, ref)) strippable++
    }
  }
  return { pages, counts, strippable }
}

/** Removes markup-ink annots (STRIP_SUBTYPES plus empty Text/Popup notes).
 *  Returns the number of removed annots. */
async function stripAnnotations(bytes) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const context = doc.context
  let removed = 0
  for (const page of doc.getPages()) {
    const arr = annotsArray(page)
    if (!arr) continue
    const before = arr.asArray()
    const kept = before.filter((ref) => {
      if (isStrippedSubtype(subtypeOf(context, ref), context, ref)) {
        removed++
        return false
      }
      return true
    })
    if (kept.length !== before.length) {
      page.node.set(PDFName.of("Annots"), context.obj(kept))
    }
  }
  if (removed === 0) return { removed, bytes }
  return { removed, bytes: await doc.save() }
}

const tmpDir = mkdtempSync(join(tmpdir(), "strip-annots-"))
const failures = []
let scanned = 0
let changed = 0
let highlightsFound = 0

async function processBytes(label, getBytes, putBytes) {
  scanned++
  let bytes
  try {
    bytes = await getBytes()
  } catch (err) {
    failures.push(`${label}: download failed: ${err.message}`)
    return
  }
  let scan
  try {
    if (!bytesCouldContainMarkup(bytes)) {
      console.log(`ok  ${label} (fast, no marker)`)
      return
    }
    scan = await inspectAnnotations(bytes)
  } catch (err) {
    failures.push(`${label}: parse failed: ${err.message}`)
    return
  }
  highlightsFound += scan.counts.Highlight ?? 0
  if ((scan.counts.Redact ?? 0) > 0) {
    failures.push(
      `${label}: redaction annotations present, apply the redaction in an editor first, stripping would expose the covered content`,
    )
    return
  }
  const summary = Object.entries(scan.counts)
    .map(([k, v]) => `${k}=${v}`)
    .join(" ")
  if (verifyOnly || scan.strippable === 0) {
    console.log(
      `${scan.strippable > 0 ? "HAS" : "ok "} ${label} (pages=${scan.pages}, ${summary || "no-annots"})`,
    )
    return
  }
  let stripped
  try {
    stripped = await stripAnnotations(bytes)
  } catch (err) {
    failures.push(`${label}: strip failed: ${err.message}`)
    return
  }
  try {
    const after = await inspectAnnotations(stripped.bytes)
    if (after.strippable !== 0) throw new Error("strippable annots remain after strip")
    if (after.pages !== scan.pages)
      throw new Error(`page count changed ${scan.pages} -> ${after.pages}`)
  } catch (err) {
    failures.push(`${label}: verify failed: ${err.message}`)
    return
  }
  try {
    await putBytes(stripped.bytes, stripped.bytes.length)
  } catch (err) {
    failures.push(`${label}: upload failed: ${err.message}`)
    return
  }
  changed++
  console.log(
    `stripped ${label} (removed=${stripped.removed}, pages=${scan.pages}, ${bytes.length} -> ${stripped.bytes.length} bytes)`,
  )
}

try {
  if (modeFiles) {
    for (const file of fileArgs) {
      const label = `file:${file}`
      await processBytes(
        label,
        async () => {
          if (!existsSync(file)) throw new Error("missing file (planners assert every source path)")
          return readFileSync(file)
        },
        async (next) => {
          if (verifyOnly) return
          writeFileSync(file, next)
          console.log(`(wrote ${file})`)
        },
      )
    }
  } else {
    const keys = pdfKeys(targets[0])
    console.log(`keys: ${keys.length} (${targets.join(",")})`)
    for (const key of keys) {
      const tmpFile = join(tmpDir, "object.pdf")
      await processBytes(
        key,
        async () => {
          run(WRANGLER, ["r2", "object", "get", `index-bucket/${key}`, targets[0], "-f", tmpFile])
          return readFileSync(tmpFile)
        },
        async (next, nextLen) => {
          for (const target of targets) {
            writeFileSync(tmpFile, next)
            run(WRANGLER, ["r2", "object", "put", `index-bucket/${key}`, target, "-f", tmpFile])
          }
          console.log(`(uploaded ${key} to ${targets.join(",")}, ${nextLen} bytes)`)
        },
      )
    }
  }
} finally {
  rmSync(tmpDir, { recursive: true, force: true })
}

console.log(
  `\nDone: scanned=${scanned} changed=${changed} highlightsFound=${highlightsFound} failed=${failures.length}`,
)
if (failures.length > 0) {
  console.error("Failures:\n" + failures.join("\n"))
  process.exit(1)
}
