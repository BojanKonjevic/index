import { describe, it, expect } from "vitest"
import { clearHighlights, getMatchMarks, getTextLayer, highlightMatches } from "@/lib/textLayer"

function makeLayer(html: string): HTMLElement {
  const div = document.createElement("div")
  div.className = "react-pdf__Page__textContent"
  div.innerHTML = html
  return div
}

function makeRoot(pageNumber: number, layer: HTMLElement): HTMLElement {
  const root = document.createElement("div")
  const page = document.createElement("div")
  page.className = "react-pdf__Page"
  page.dataset.pageNumber = String(pageNumber)
  page.appendChild(layer)
  root.appendChild(page)
  return root
}

type Rect = { left: number; right: number; top: number; bottom: number }

/** Stubs per-span getBoundingClientRect (jsdom reports all-zero rects). */
function stubRects(layer: HTMLElement, rects: Rect[]) {
  const spans = layer.querySelectorAll("span")
  spans.forEach((span, i) => {
    span.getBoundingClientRect = () => rects[i] as unknown as DOMRect
  })
}

describe("highlightMatches", () => {
  it("wraps a single occurrence and returns 1", () => {
    const layer = makeLayer("<span>Loranov red je važan</span>")
    expect(highlightMatches(layer, "loran")).toBe(1)
    const marks = getMatchMarks(layer)
    expect(marks).toHaveLength(1)
    expect(marks[0].textContent).toBe("Loran")
    expect(marks[0].className).toBe("search-hit")
  })

  it("wraps occurrences across multiple spans", () => {
    const layer = makeLayer("<span>Loranov red</span><span>rešenje loran</span>")
    expect(highlightMatches(layer, "loran")).toBe(2)
    expect(getMatchMarks(layer)).toHaveLength(2)
  })

  it("finds a term split across two spans, wrapping one logical match in two marks", () => {
    const layer = makeLayer("<span>Lor</span><span>anov red</span>")
    expect(highlightMatches(layer, "loran")).toBe(1)
    const marks = getMatchMarks(layer)
    expect(marks).toHaveLength(2)
    expect(marks[0].textContent).toBe("Lor")
    expect(marks[1].textContent).toBe("an")
    expect(layer.textContent).toBe("Loranov red")
  })

  it("finds a term spanning three nodes across spans", () => {
    const layer = makeLayer("<span>Lo</span><span>r</span><span>an red</span>")
    expect(highlightMatches(layer, "loran")).toBe(1)
    const marks = getMatchMarks(layer)
    expect(marks).toHaveLength(3)
    expect(marks.map((m) => m.textContent)).toEqual(["Lo", "r", "an"])
    expect(layer.textContent).toBe("Loran red")
  })

  it("finds a term split across text nodes inside one span", () => {
    const layer = makeLayer("<span></span>")
    const span = layer.querySelector("span")!
    span.appendChild(document.createTextNode("Lor"))
    span.appendChild(document.createTextNode("anov red"))
    expect(highlightMatches(layer, "loran")).toBe(1)
    expect(getMatchMarks(layer)).toHaveLength(2)
    expect(layer.textContent).toBe("Loranov red")
  })

  it("finds multiple occurrences when some span node boundaries and others do not", () => {
    const layer = makeLayer("<span>Lor</span><span>an loran red</span>")
    expect(highlightMatches(layer, "loran")).toBe(2)
    expect(getMatchMarks(layer)).toHaveLength(3)
    expect(layer.textContent).toBe("Loran loran red")
  })

  it("keeps a zero-gap mid-word split joined when real rects are present", () => {
    const layer = makeLayer("<span>Lor</span><span>anov red</span>")
    stubRects(layer, [
      { left: 0, right: 30, top: 0, bottom: 14 },
      { left: 30, right: 80, top: 0, bottom: 14 },
    ])
    expect(highlightMatches(layer, "loran")).toBe(1)
    expect(getMatchMarks(layer)).toHaveLength(2)
  })

  it("does not fuse two distinct words separated by a horizontal gap", () => {
    const layer = makeLayer("<span>koordinat</span><span>e sistema</span>")
    stubRects(layer, [
      { left: 0, right: 60, top: 0, bottom: 14 },
      { left: 80, right: 140, top: 0, bottom: 14 },
    ])
    expect(highlightMatches(layer, "koordinate")).toBe(0)
    expect(getMatchMarks(layer)).toHaveLength(0)
    expect(layer.textContent).toBe("koordinate sistema") // DOM is never modified
  })

  it("does not fuse words on different lines", () => {
    const layer = makeLayer("<span>koordinat</span><span>e sistema</span>")
    stubRects(layer, [
      { left: 0, right: 60, top: 0, bottom: 14 },
      { left: 0, right: 60, top: 24, bottom: 38 },
    ])
    expect(highlightMatches(layer, "koordinate")).toBe(0)
    expect(getMatchMarks(layer)).toHaveLength(0)
  })

  it("still matches terms fully inside a gapped span", () => {
    const layer = makeLayer("<span>koordinat</span><span>e sistema</span>")
    stubRects(layer, [
      { left: 0, right: 60, top: 0, bottom: 14 },
      { left: 80, right: 140, top: 0, bottom: 14 },
    ])
    expect(highlightMatches(layer, "sistema")).toBe(1)
    expect(getMatchMarks(layer)[0].textContent).toBe("sistema")
  })

  it("matches Cyrillic against a Latin query", () => {
    const layer = makeLayer("<span>Лоранов ред</span>")
    expect(highlightMatches(layer, "loran")).toBe(1)
    expect(getMatchMarks(layer)[0].textContent).toBe("Лоран")
  })

  it("matches diacritics-insensitively", () => {
    const layer = makeLayer("<span>rešenje je sledeće</span>")
    expect(highlightMatches(layer, "resenje")).toBe(1)
    expect(getMatchMarks(layer)[0].textContent).toBe("rešenje")
  })

  it("merges overlapping occurrences without corrupting the text", () => {
    const layer = makeLayer("<span>aaaa</span>")
    expect(highlightMatches(layer, "aa")).toBe(3)
    const marks = getMatchMarks(layer)
    expect(marks).toHaveLength(1)
    expect(marks[0].textContent).toBe("aaaa")
    expect(layer.textContent).toBe("aaaa")
  })

  it("preserves the layer text content after highlighting", () => {
    const layer = makeLayer("<span>Loranov red, rešenje</span>")
    highlightMatches(layer, "loran")
    expect(layer.textContent).toBe("Loranov red, rešenje")
  })

  it("is a no-op for an empty query", () => {
    const layer = makeLayer("<span>Loranov</span>")
    expect(highlightMatches(layer, "  ")).toBe(0)
    expect(getMatchMarks(layer)).toHaveLength(0)
  })

  it("is idempotent when re-run with the same query", () => {
    const layer = makeLayer("<span>Loranov red</span>")
    expect(highlightMatches(layer, "loran")).toBe(1)
    expect(highlightMatches(layer, "loran")).toBe(1)
    expect(getMatchMarks(layer)).toHaveLength(1)
    expect(layer.textContent).toBe("Loranov red")
  })
})

describe("clearHighlights", () => {
  it("removes all marks and restores plain text", () => {
    const layer = makeLayer("<span>Loranov <mark class='search-hit'>red</mark></span>")
    clearHighlights(layer)
    expect(getMatchMarks(layer)).toHaveLength(0)
    expect(layer.textContent).toBe("Loranov red")
  })

  it("leaves layers without marks untouched", () => {
    const layer = makeLayer("<span>Loranov red</span>")
    clearHighlights(layer)
    expect(layer.innerHTML).toBe("<span>Loranov red</span>")
  })
})

describe("getTextLayer", () => {
  it("finds the layer for the requested page number", () => {
    const layer = makeLayer("<span>x</span>")
    const root = makeRoot(4, layer)
    expect(getTextLayer(root, 4)).toBe(layer)
    expect(getTextLayer(root, 5)).toBeNull()
  })
})
