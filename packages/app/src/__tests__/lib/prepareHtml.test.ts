import { describe, it, expect } from "vitest"
import { prepareHtmlBytes } from "@/lib/prepareHtml"

const ORIGIN = "https://example.com"
const URL = "/api/file/ori/kurs/ucenje-potkrepljenjem/index.html"
const enc = (s: string) => new TextEncoder().encode(s)

describe("prepareHtmlBytes", () => {
  it("inserts a base tag pointing at the document directory", () => {
    const out = prepareHtmlBytes(
      enc('<html><head><title>x</title></head><body><img src="a.png"></body></html>'),
      URL,
      ORIGIN,
    )
    expect(out).toContain(
      '<head><base href="https://example.com/api/file/ori/kurs/ucenje-potkrepljenjem/">',
    )
  })

  it("replaces a stale base tag instead of duplicating", () => {
    const out = prepareHtmlBytes(
      enc('<html><head><base href="file:///C:/old/"><title>x</title></head><body></body></html>'),
      URL,
      ORIGIN,
    )
    expect(out.match(/<base /g)).toHaveLength(1)
    expect(out).toContain("https://example.com/api/file/ori/kurs/ucenje-potkrepljenjem/")
  })

  it("always adds the image overflow guard", () => {
    const out = prepareHtmlBytes(enc("<html><head></head><body></body></html>"), URL, ORIGIN)
    expect(out).toContain("<style>img{max-width:100%;height:auto}</style>")
  })

  it("ignores base lookalikes outside the head", () => {
    const out = prepareHtmlBytes(
      enc('<html><head><title>x</title></head><body><!-- <base href="x"> --></body></html>'),
      URL,
      ORIGIN,
    )
    expect(out.match(/<base href="https/g)).toHaveLength(1)
    expect(out).toContain('<!-- <base href="x"> -->')
  })

  it("prepends when the document has no head", () => {
    const out = prepareHtmlBytes(enc("<p>hi</p>"), URL, ORIGIN)
    expect(out.startsWith("<base href=")).toBe(true)
  })

  it("keeps the notebook prompt gutter widening", () => {
    const out = prepareHtmlBytes(enc("<style>a{--jp-cell-prompt-width: 64px}</style>"), URL, ORIGIN)
    expect(out).toContain("--jp-cell-prompt-width: 96px")
    expect(out).not.toContain("64px")
  })

  it("keeps refs untouched for the browser to resolve through the base", () => {
    const out = prepareHtmlBytes(
      enc('<html><head></head><body><img src="/api/file/x/a.png"><img src="b.png"></body></html>'),
      URL,
      ORIGIN,
    )
    expect(out).toContain('<img src="/api/file/x/a.png">')
    expect(out).toContain('<img src="b.png">')
    expect(out).toContain(
      '<base href="https://example.com/api/file/ori/kurs/ucenje-potkrepljenjem/">',
    )
  })
})
