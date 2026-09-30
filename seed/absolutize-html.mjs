#!/usr/bin/env node
// Rewrites relative resource references in a stored HTML file to
// root-absolute /api/file/ URLs. The app renders these pages through a
// Blob-URL iframe (platform CSP blocks subresources on direct R2 serving),
// and blob documents resolve relative refs against blob: which breaks them.
// Root-absolute paths resolve against the app origin in every environment
// (local dev and prod) with no host hardcoding.
// Usage: node absolutize-html.mjs <input.html> <r2-prefix> <output.html>
// Example: node absolutize-html.mjs nb.html nans/vezbe/v2 out.html
//   img/celcius.gif -> /api/file/nans/vezbe/v2/img/celcius.gif
import { readFileSync, writeFileSync } from "node:fs"

const [inPath, prefix, outPath] = process.argv.slice(2)
if (!inPath || !prefix || !outPath) {
  console.error("usage: node absolutize-html.mjs <input.html> <r2-prefix> <output.html>")
  process.exit(1)
}

const cleanPrefix = prefix.replace(/\/+$/, "")
let html = readFileSync(inPath, "utf8")
let count = 0
html = html.replace(/(src|href)="([^"#]+?)(#[^"]*)?"/g, (m, attr, ref, hash = "") => {
  if (/^(https?:|data:|blob:|mailto:|#)/i.test(ref) || ref === "") return m
  // Treat as relative to the HTML file's own directory.
  const abs = `/api/file/${cleanPrefix}/${ref.replace(/^\.\//, "")}`
  count++
  return `${attr}="${abs}${hash}"`
})
writeFileSync(outPath, html)
console.log(`${outPath}: rewrote ${count} refs`)
