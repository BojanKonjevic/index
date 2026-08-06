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
