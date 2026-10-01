#!/usr/bin/env node
// Stitches ordered images into one PDF (photo-only sets, policy 6).
// Usage: node stitch-pdf.mjs <manifest.json> <output.pdf>
// Manifest: { "pages": [{ "file": "/abs/img.jpg", "rotate": 0 }] }
// rotate is optional clockwise degrees (0, 90, 180, 270). Each PDF page is
// sized to its image. JPEG bytes embed as-is, PNGs embed directly.
import { readFileSync, writeFileSync } from "node:fs"
import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib"

const [manifestPath, outPath] = process.argv.slice(2)
if (!manifestPath || !outPath) {
  console.error("usage: node stitch-pdf.mjs <manifest.json> <output.pdf>")
  process.exit(1)
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"))
const doc = await PDFDocument.create()

// Optional cover page listing the fused set contents, so nobody opens the
// PDF just to learn what is inside it. Cover text must stay ASCII: pdf-lib
// standard fonts have no central-european glyphs, diacritics break.
if (manifest.cover) {
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const page = doc.addPage([595, 842])
  page.drawText(manifest.cover.title, { x: 56, y: 770, size: 22, font: bold, color: rgb(0, 0, 0) })
  let y = 730
  for (const line of manifest.cover.lines) {
    page.drawText(line, { x: 56, y, size: 12, font, color: rgb(0.2, 0.2, 0.2) })
    y -= 22
  }
}
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
console.log(`wrote ${outPath} (${doc.getPageCount()} pages)`)
