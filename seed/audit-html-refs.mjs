#!/usr/bin/env node
// Audits same-host references of every seeded HTML document: extracts
// src/href refs, resolves them against the document directory (following
// <base> when present, exactly like the viewer), follows HTML refs
// transitively, and reports anything that does not resolve in R2. Exits
// nonzero when companions are missing, clean when the corpus is at parity
// with its sources (RULES.md 15).
//
// Usage: node audit-html-refs.mjs [--local-only] [--origin=https://host]
// Defaults to remote R2. Reads material urls from D1, fetches over HTTP.
import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { ROOT_DIR, WRANGLER, run } from "./lib/run.mjs"

const API_PREFIX = "/api/file/"
const UA = "Mozilla/5.0 (compatible; index-audit/1.0)"

const args = process.argv.slice(2)
const envFlag = args.includes("--local-only") ? "--local" : "--remote"
const originFlag = args.find((a) => a.startsWith("--origin="))
const origin = originFlag
  ? originFlag.slice("--origin=".length)
  : envFlag === "--local"
    ? "http://localhost:8787"
    : "https://ftn-index.bojan-dev.workers.dev"

function curlCapture(extraArgs, encoding) {
  const res = spawnSync("curl", ["-s", "-A", UA, ...extraArgs], {
    encoding,
    maxBuffer: 256 * 1024 * 1024,
  })
  if (res.status !== 0) throw new Error(`curl failed`)
  return res.stdout
}

function curlStatus(url) {
  const out = curlCapture(
    ["-o", "/dev/null", "-w", "%{http_code}", "-H", "Range: bytes=0-0", url],
    "utf8",
  )
  return parseInt(out.trim() || "0", 10)
}

function curlBody(url) {
  return curlCapture([url], "buffer").toString("utf-8")
}

function materialUrls() {
  const out = run(WRANGLER, [
    "d1",
    "execute",
    "index-db",
    envFlag,
    "--json",
    "--command",
    "SELECT id, url FROM materials WHERE file_type='html' ORDER BY id",
  ])
  return JSON.parse(out.slice(out.indexOf("[")))
    .flatMap((r) => r.results ?? [])
    .filter((r) => typeof r.url === "string" && r.url.startsWith(API_PREFIX))
}

const REF_RE = /(?:src|href|poster)\s*=\s*(?:"([^"#]+)"|'([^'#]+)'|([^\s>]+))/gi
const BASE_RE = /<base[^>]*href\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i
const CSS_URL_RE = /url\(\s*(?:"([^"]+)"|'([^']+)'|([^)"\s]+))\s*\)/gi

let exceptions = new Map()
try {
  const raw = readFileSync(join(ROOT_DIR, "seed", "html-refs-exceptions.json"), "utf8")
  for (const { url, reason } of JSON.parse(raw)) exceptions.set(url, reason)
} catch {
  /* no exceptions file: every gap fails */
}

function refsOf(html) {
  const out = new Set()
  const skip = /^(https?:|data:|blob:|mailto:|javascript:|#)/i
  const unwrap = (ref) => {
    // A quoted value containing # falls through to the unquoted branch
    // quotes included; unwrap it back to what the browser resolves.
    if (ref.length >= 2 && ref.startsWith('"') && ref.endsWith('"')) return ref.slice(1, -1)
    if (ref.length >= 2 && ref.startsWith("'") && ref.endsWith("'")) return ref.slice(1, -1)
    return ref
  }
  for (const m of html.matchAll(REF_RE)) {
    const ref = unwrap((m[1] ?? m[2] ?? m[3] ?? "").trim())
    if (!ref || skip.test(ref)) continue
    out.add(ref)
  }
  for (const m of html.matchAll(/srcset\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/gi)) {
    const raw = m[1] ?? m[2] ?? m[3] ?? ""
    for (const part of raw.split(",")) {
      const ref = part.trim().split(/\s+/)[0] ?? ""
      if (!ref || skip.test(ref)) continue
      out.add(ref)
    }
  }
  for (const m of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) {
    for (const ref of cssRefs(m[1])) {
      if (skip.test(ref)) continue
      out.add(ref)
    }
  }
  for (const m of html.matchAll(/style\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/gi)) {
    const raw = m[1] ?? m[2] ?? m[3] ?? ""
    for (const ref of cssRefs(raw)) {
      if (skip.test(ref)) continue
      out.add(ref)
    }
  }
  return [...out]
}

/** Resolves a raw ref against a directory, mirroring the viewer: base tags
 *  win, protocol-relative refs inherit the document scheme. */
function resolveRef(ref, dir) {
  const absolute = ref.startsWith("//") ? new URL(dir).protocol + ref : ref
  return new URL(absolute, dir).href
}

function cssRefs(text) {
  const out = []
  for (const m of text.matchAll(CSS_URL_RE)) {
    const ref = (m[1] ?? m[2] ?? m[3] ?? "").trim()
    if (ref) out.push(ref)
  }
  return out
}

function baseDirOf(html, docUrl) {
  // Same head-region restriction as the viewer: a <base> lookalike inside
  // a comment or body markup must not win.
  const headClose = /<\/head\s*>/i.exec(html)
  const headRegion = headClose ? html.slice(0, headClose.index) : html
  const baseMatch = headRegion.match(BASE_RE)
  const baseHref = baseMatch?.[1] ?? baseMatch?.[2] ?? baseMatch?.[3]
  return new URL(".", baseHref ? resolveRef(baseHref, docUrl) : docUrl).href
}

const missing = new Map()
const checked = new Set()

function checkUrl(absUrl, fromId) {
  if (checked.has(absUrl)) return
  checked.add(absUrl)
  const status = curlStatus(absUrl)
  if (status !== 200 && status !== 206) {
    if (!missing.has(fromId)) missing.set(fromId, [])
    missing.get(fromId).push(`${status} ${absUrl.slice(origin.length)}`)
  }
  return status
}

for (const { id, url } of materialUrls()) {
  const docUrl = origin + url
  let html
  try {
    html = curlBody(docUrl)
  } catch {
    if (!missing.has(id)) missing.set(id, [])
    missing.get(id).push(`DOC FETCH FAIL ${url}`)
    continue
  }
  if (!/<html|<!doctype/i.test(html.slice(0, 2000))) {
    if (!missing.has(id)) missing.set(id, [])
    missing.get(id).push("DOC NOT HTML")
    continue
  }
  const docDir = baseDirOf(html, docUrl)
  const queue = refsOf(html).map((r) => ({ dir: docDir, ref: r, from: id }))
  const seenDocs = new Set([docUrl])
  while (queue.length > 0) {
    const { dir, ref, from } = queue.pop()
    let abs
    try {
      abs = resolveRef(ref, dir)
    } catch {
      continue
    }
    if (!abs.startsWith(origin + API_PREFIX)) continue
    const status = checkUrl(abs, from)
    if (status !== 200 && status !== 206) continue
    if (abs.toLowerCase().endsWith(".html") && !seenDocs.has(abs)) {
      seenDocs.add(abs)
      let sub
      try {
        sub = curlBody(abs)
      } catch {
        continue
      }
      if (!/<html|<!doctype/i.test(sub.slice(0, 2000))) continue
      const subDir = baseDirOf(sub, abs)
      for (const r2 of refsOf(sub)) queue.push({ dir: subDir, ref: r2, from })
    } else if (abs.toLowerCase().endsWith(".css") && !seenDocs.has(abs)) {
      seenDocs.add(abs)
      let css
      try {
        css = curlBody(abs)
      } catch {
        continue
      }
      const cssDir = new URL(".", abs).href
      for (const ref of cssRefs(css)) queue.push({ dir: cssDir, ref, from })
    }
  }
}

console.log(`materials with missing companions: ${missing.size}`)
let failed = 0
for (const [id, list] of [...missing.entries()].sort()) {
  const live = list.filter((item) => {
    const url = item.slice(item.indexOf(" ") + 1)
    if (exceptions.has(url)) {
      console.log(`- ${id} (excepted): ${url} (${exceptions.get(url)})`)
      return false
    }
    return true
  })
  if (live.length === 0) continue
  failed++
  console.log(`- ${id} (${live.length}):`)
  for (const item of live.slice(0, 20)) console.log(`    ${item}`)
}
if (failed > 0) process.exit(1)
