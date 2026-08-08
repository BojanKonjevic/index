import { afterEach, describe, it, expect, vi } from "vitest"
import {
  clearHighlights,
  getMatchHighlights,
  getOrderedHighlights,
  getTextLayer,
  highlightMatches,
} from "@/lib/textLayer"

afterEach(() => {
  vi.restoreAllMocks()
})

function makeLayer(html: string): HTMLElement {
  const page = document.createElement("div")
  page.className = "react-pdf__Page"
  const layer = document.createElement("div")
  layer.className = "react-pdf__Page__textContent"
  layer.innerHTML = html
  page.appendChild(layer)
  return layer
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

/** Stubs per-span getBoundingClientRect (happy-dom reports all-zero rects). */
function stubRects(layer: HTMLElement, rects: Rect[]) {
  const spans = layer.querySelectorAll("span")
  spans.forEach((span, i) => {
    span.getBoundingClientRect = () => rects[i] as unknown as DOMRect
  })
}

/** Stubs Range.getBoundingClientRect() (not implemented in happy-dom) with
 *  one rect per call: call k returns `calls[k]`, or a single default rect if
 *  the test does not provide one. A call is made per match fragment that
 *  only partially covers its text node (whole-node fragments reuse the
 *  span's own rect). */
function stubRangeRects(...calls: Rect[]) {
  const fallback: Rect = { left: 0, right: 40, top: 0, bottom: 12 }
  let i = 0
  vi.spyOn(Range.prototype, "getBoundingClientRect").mockImplementation(() => {
    const r = calls[i++] ?? fallback
    return {
      left: r.left,
      top: r.top,
      right: r.right,
      bottom: r.bottom,
      width: r.right - r.left,
      height: r.bottom - r.top,
    } as unknown as DOMRect
  })
}

describe("highlightMatches", () => {
  it("highlights a single occurrence as one overlay box and returns 1", () => {
    const layer = makeLayer("<span>Loranov red je važan</span>")
    stubRangeRects()
    expect(highlightMatches(layer, "loran")).toBe(1)
    const boxes = getMatchHighlights(layer)
    expect(boxes).toHaveLength(1)
    expect(boxes[0].className).toBe("search-hit")
    expect(boxes[0].style.left).toBe("0px")
    expect(boxes[0].style.top).toBe("0px")
    expect(boxes[0].style.width).toBe("40px")
    expect(boxes[0].style.height).toBe("12px")
    expect(layer.textContent).toBe("Loranov red je važan") // DOM is never modified
  })

  it("merges fragments split across spans into a single box", () => {
    const layer = makeLayer("<span>Lor</span><span>anov red</span>")
    stubRects(layer, [
      { left: 0, right: 30, top: 0, bottom: 14 },
      { left: 30, right: 85, top: 0, bottom: 14 },
    ])
    stubRangeRects({ left: 30, right: 60, top: 0, bottom: 14 })
    expect(highlightMatches(layer, "loran")).toBe(1)
    const boxes = getMatchHighlights(layer)
    expect(boxes).toHaveLength(1)
    expect(boxes[0].style.left).toBe("0px")
    expect(boxes[0].style.width).toBe("60px")
    expect(layer.textContent).toBe("Loranov red")
  })

  it("merges a term split across three spans into one box", () => {
    const layer = makeLayer("<span>Lo</span><span>r</span><span>an red</span>")
    stubRects(layer, [
      { left: 0, right: 20, top: 0, bottom: 14 },
      { left: 20, right: 30, top: 1, bottom: 14 },
      { left: 30, right: 70, top: 0, bottom: 14 },
    ])
    stubRangeRects({ left: 30, right: 50, top: 0, bottom: 14 })
    expect(highlightMatches(layer, "loran")).toBe(1)
    const boxes = getMatchHighlights(layer)
    expect(boxes).toHaveLength(1)
    expect(boxes[0].style.width).toBe("50px")
    expect(layer.textContent).toBe("Loran red")
  })

  it("absorbs vertical jitter within one visual line into a single box", () => {
    const layer = makeLayer("<span>Lor</span><span>anov red</span>")
    stubRects(layer, [
      { left: 0, right: 30, top: 0, bottom: 12 },
      { left: 30, right: 80, top: 3, bottom: 16 },
    ])
    stubRangeRects({ left: 30, right: 60, top: 3, bottom: 16 })
    expect(highlightMatches(layer, "loran")).toBe(1)
    const boxes = getMatchHighlights(layer)
    expect(boxes).toHaveLength(1)
    expect(boxes[0].style.top).toBe("0px")
    expect(boxes[0].style.height).toBe("16px")
  })

  it("highlights occurrences across multiple spans", () => {
    const layer = makeLayer("<span>Loranov red</span><span>rešenje loran</span>")
    stubRangeRects()
    expect(highlightMatches(layer, "loran")).toBe(2)
    expect(getMatchHighlights(layer)).toHaveLength(2)
  })

  it("finds a term split across text nodes inside one span", () => {
    const layer = makeLayer("<span></span>")
    const span = layer.querySelector("span")!
    span.appendChild(document.createTextNode("Lor"))
    span.appendChild(document.createTextNode("anov red"))
    stubRects(layer, [{ left: 0, right: 80, top: 0, bottom: 14 }])
    stubRangeRects({ left: 30, right: 60, top: 0, bottom: 14 })
    expect(highlightMatches(layer, "loran")).toBe(1)
    expect(getMatchHighlights(layer)).toHaveLength(1)
    expect(layer.textContent).toBe("Loranov red")
  })

  it("finds multiple occurrences when some span node boundaries and others do not", () => {
    const layer = makeLayer("<span>Lor</span><span>an loran red</span>")
    stubRects(layer, [
      { left: 0, right: 30, top: 0, bottom: 14 },
      { left: 30, right: 160, top: 0, bottom: 14 },
    ])
    stubRangeRects(
      { left: 30, right: 60, top: 1, bottom: 14 },
      { left: 60, right: 105, top: 0, bottom: 14 },
    )
    expect(highlightMatches(layer, "loran")).toBe(2)
    expect(getMatchHighlights(layer)).toHaveLength(2)
    expect(layer.textContent).toBe("Loran loran red")
  })

  it("does not fuse two distinct words separated by a horizontal gap", () => {
    const layer = makeLayer("<span>koordinat</span><span>e sistema</span>")
    stubRects(layer, [
      { left: 0, right: 60, top: 0, bottom: 14 },
      { left: 80, right: 140, top: 0, bottom: 14 },
    ])
    expect(highlightMatches(layer, "koordinate")).toBe(0)
    expect(getMatchHighlights(layer)).toHaveLength(0)
    expect(layer.textContent).toBe("koordinate sistema") // DOM is never modified
  })

  it("does not fuse words on different lines", () => {
    const layer = makeLayer("<span>koordinat</span><span>e sistema</span>")
    stubRects(layer, [
      { left: 0, right: 60, top: 0, bottom: 14 },
      { left: 0, right: 60, top: 24, bottom: 38 },
    ])
    expect(highlightMatches(layer, "koordinate")).toBe(0)
    expect(getMatchHighlights(layer)).toHaveLength(0)
  })

  it("still matches terms fully inside a gapped span", () => {
    const layer = makeLayer("<span>koordinat</span><span>e sistema</span>")
    stubRects(layer, [
      { left: 0, right: 60, top: 0, bottom: 14 },
      { left: 80, right: 140, top: 0, bottom: 14 },
    ])
    stubRangeRects({ left: 80, right: 140, top: 0, bottom: 14 })
    expect(highlightMatches(layer, "sistema")).toBe(1)
    const boxes = getMatchHighlights(layer)
    expect(boxes).toHaveLength(1)
    expect(boxes[0].style.left).toBe("80px")
    expect(boxes[0].style.width).toBe("60px")
  })

  it("reuses the span's own rect when the match covers the whole node", () => {
    const layer = makeLayer("<span>sistema</span>")
    stubRects(layer, [{ left: 80, right: 140, top: 0, bottom: 14 }])
    const spy = vi.spyOn(Range.prototype, "getBoundingClientRect")
    expect(highlightMatches(layer, "sistema")).toBe(1)
    expect(spy).not.toHaveBeenCalled()
    const boxes = getMatchHighlights(layer)
    expect(boxes).toHaveLength(1)
    expect(boxes[0].style.left).toBe("80px")
    expect(boxes[0].style.width).toBe("60px")
    expect(boxes[0].style.height).toBe("14px")
  })

  it("matches Cyrillic against a Latin query", () => {
    const layer = makeLayer("<span>Лоранов ред</span>")
    stubRangeRects()
    expect(highlightMatches(layer, "loran")).toBe(1)
    expect(getMatchHighlights(layer)).toHaveLength(1)
  })

  it("matches diacritics-insensitively", () => {
    const layer = makeLayer("<span>rešenje je sledeće</span>")
    stubRangeRects()
    expect(highlightMatches(layer, "resenje")).toBe(1)
    expect(getMatchHighlights(layer)).toHaveLength(1)
  })

  it("paints overlapping occurrences without corrupting the text", () => {
    const layer = makeLayer("<span>aaaa</span>")
    stubRangeRects()
    expect(highlightMatches(layer, "aa")).toBe(3)
    expect(getMatchHighlights(layer)).toHaveLength(3)
    expect(layer.textContent).toBe("aaaa")
  })

  it("preserves the layer text content after highlighting", () => {
    const layer = makeLayer("<span>Loranov red, rešenje</span>")
    stubRangeRects()
    highlightMatches(layer, "loran")
    expect(layer.textContent).toBe("Loranov red, rešenje")
  })

  it("is a no-op for an empty query", () => {
    const layer = makeLayer("<span>Loranov</span>")
    expect(highlightMatches(layer, "  ")).toBe(0)
    expect(getMatchHighlights(layer)).toHaveLength(0)
  })

  it("is idempotent when re-run with the same query", () => {
    const layer = makeLayer("<span>Loranov red</span>")
    stubRangeRects()
    expect(highlightMatches(layer, "loran")).toBe(1)
    expect(highlightMatches(layer, "loran")).toBe(1)
    expect(getMatchHighlights(layer)).toHaveLength(1)
    expect(layer.textContent).toBe("Loranov red")
  })
})

describe("getOrderedHighlights", () => {
  it("orders highlight boxes by visual position, not DOM order", () => {
    const layer = makeLayer("<span>x</span>")
    const overlay = document.createElement("div")
    overlay.className = "search-hit-overlay"
    layer.parentElement!.appendChild(overlay)
    const first = document.createElement("div")
    first.className = "search-hit"
    const second = document.createElement("div")
    second.className = "search-hit"
    overlay.append(first, second)
    first.getBoundingClientRect = () =>
      ({ left: 10, top: 40, right: 50, bottom: 54 }) as unknown as DOMRect
    second.getBoundingClientRect = () =>
      ({ left: 90, top: 10, right: 130, bottom: 24 }) as unknown as DOMRect
    expect(getOrderedHighlights(layer)).toEqual([second, first])
  })
})

describe("clearHighlights", () => {
  it("removes all boxes and leaves the layer text untouched", () => {
    const layer = makeLayer("<span>Loranov red</span>")
    stubRangeRects({ left: 0, right: 40, top: 0, bottom: 12 })
    highlightMatches(layer, "loran")
    expect(getMatchHighlights(layer)).toHaveLength(1)
    clearHighlights(layer)
    expect(getMatchHighlights(layer)).toHaveLength(0)
    expect(layer.textContent).toBe("Loranov red")
    expect(layer.querySelector("mark")).toBeNull()
  })

  it("leaves layers without an overlay untouched", () => {
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
