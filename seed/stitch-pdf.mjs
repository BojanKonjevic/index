#!/usr/bin/env node
// Stitches ordered images into one PDF (photo-only sets, policy 6).
// Usage: node stitch-pdf.mjs <manifest.json> <output.pdf>
// Manifest: { "pages": [{ "file": "/abs/img.jpg", "rotate": 0 }] }
// rotate is optional clockwise degrees (0, 90, 180, 270). Each PDF page is
// sized to its image. JPEG bytes embed as-is, PNGs embed directly.
import { readFileSync, writeFileSync } from "node:fs"
import { PDFDocument, degrees } from "pdf-lib"

const [manifestPath, outPath] = process.argv.slice(2)
if (!manifestPath || !outPath) {
  console.error("usage: node stitch-pdf.mjs <manifest.json> <output.pdf>")
  process.exit(1)
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"))
const doc = await PDFDocument.create()
for (const page of manifest.pages) {
  const bytes = readFileSync(page.file)
  // Sniff magic bytes: extensions lie (phone screenshots saved as .png
  // that are really JPEGs). FF D8 is JPEG, 89 50 4E 47 is PNG.
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
  const img = isPng ? await doc.embedPng(bytes) : await doc.embedJpg(bytes)
  const p = doc.addPage([img.width, img.height])
  p.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height })
  if (page.rotate) p.setRotation(degrees(page.rotate))
}
writeFileSync(outPath, await doc.save())
console.log(`wrote ${outPath} (${manifest.pages.length} pages)`)
