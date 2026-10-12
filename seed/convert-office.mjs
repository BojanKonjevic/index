#!/usr/bin/env node
// Converts office documents (doc, docx, rtf, pptx) to PDF with headless
// LibreOffice, per RULES.md 3. Slide decks become plain PDF documents:
// no custom HTML linearization, no slides viewer. Requires LibreOffice on
// PATH (`brew install libreoffice`). Every output needs a human visual
// check before seeding; this script only runs the conversion repeatably.
//
// Usage: node convert-office.mjs out-dir file.docx [more...]
// Prints the produced PDFs and their page counts (via pdf-lib, no extra
// deps beyond the root pdf-lib).
import { spawnSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync } from "node:fs"
import { basename, join, resolve } from "node:path"
import { PDFDocument } from "pdf-lib"

const args = process.argv.slice(2)
const outDir = args[0]
const inputs = args.slice(1)
if (!outDir || inputs.length === 0) {
  console.error("usage: node convert-office.mjs out-dir file.docx [more...]")
  process.exit(1)
}
for (const input of inputs) {
  if (!existsSync(input)) {
    console.error(`X missing file (planners assert every source path): ${input}`)
    process.exitCode = 1
    continue
  }
}

mkdirSync(outDir, { recursive: true })
const failed = []
for (const input of inputs) {
  if (!existsSync(input)) continue
  const res = spawnSync(
    "soffice",
    ["--headless", "--convert-to", "pdf", "--outdir", resolve(outDir), resolve(input)],
    {
      encoding: "utf8",
    },
  )
  const stem = basename(input).replace(/\.[^.]+$/, "")
  const out = join(resolve(outDir), `${stem}.pdf`)
  if (res.status !== 0 || !existsSync(out)) {
    failed.push(input)
    console.error(`X ${input}: ${(res.stderr || res.error?.message || "no output").slice(0, 200)}`)
    continue
  }
  try {
    const pages = (await PDFDocument.load(readFileSync(out))).getPageCount()
    console.log(`ok ${input} -> ${out} (${pages} pages, VISUAL CHECK STILL REQUIRED)`)
  } catch (err) {
    failed.push(input)
    console.error(`X ${input}: output does not parse: ${err.message}`)
  }
}
if (failed.length > 0) process.exit(1)
