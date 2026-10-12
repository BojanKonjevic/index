import { afterEach, describe, it, expect, vi } from "vitest"
import {
  boxesForSpanIntervals,
  charFractions,
  clearHighlights,
  clearSelectionOverlays,
  getMatchHighlights,
  getOrderedHighlights,
  getTextLayer,
  highlightMatches,
  leafSpans,
  mergeSelectionRects,
  paintSelection,
  spanIntervals,
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

describe("mergeSelectionRects", () => {
  it("merges same-line fragments across font runs into one bar", () => {
    const merged = mergeSelectionRects([
      { left: 10, top: 100, right: 60, bottom: 114 },
      { left: 60, top: 101, right: 65, bottom: 114 },
      { left: 65, top: 100, right: 140, bottom: 114 },
    ])
    expect(merged).toEqual([{ left: 10, top: 100, right: 140, bottom: 114 }])
  })

  it("bridges horizontal gaps between runs on one line", () => {
    const merged = mergeSelectionRects([
      { left: 10, top: 100, right: 60, bottom: 114 },
      { left: 90, top: 100, right: 140, bottom: 114 },
    ])
    expect(merged).toEqual([{ left: 10, top: 100, right: 140, bottom: 114 }])
  })

  it("keeps separate visual lines apart", () => {
    const merged = mergeSelectionRects([
      { left: 10, top: 100, right: 140, bottom: 114 },
      { left: 10, top: 124, right: 120, bottom: 138 },
    ])
    expect(merged).toHaveLength(2)
    expect(merged[0]).toEqual({ left: 10, top: 100, right: 140, bottom: 114 })
    expect(merged[1]).toEqual({ left: 10, top: 124, right: 120, bottom: 138 })
  })

  it("unifies ragged mixed-size runs into one even bar", () => {
    const merged = mergeSelectionRects([
      { left: 10, top: 96, right: 80, bottom: 120 },
      { left: 80, top: 102, right: 160, bottom: 116 },
    ])
    expect(merged).toEqual([{ left: 10, top: 96, right: 160, bottom: 120 }])
  })

  it("drops degenerate fragments", () => {
    expect(
      mergeSelectionRects([
        { left: 50, top: 50, right: 50, bottom: 64 },
        { left: 10, top: 100, right: 60, bottom: 100.1 },
        { left: 10, top: 120, right: 60, bottom: 134 },
      ]),
    ).toEqual([{ left: 10, top: 120, right: 60, bottom: 134 }])
  })

  it("sorts by line before merging", () => {
    const merged = mergeSelectionRects([
      { left: 10, top: 124, right: 120, bottom: 138 },
      { left: 10, top: 100, right: 60, bottom: 114 },
      { left: 60, top: 100, right: 140, bottom: 114 },
    ])
    expect(merged).toHaveLength(2)
    expect(merged[0]).toEqual({ left: 10, top: 100, right: 140, bottom: 114 })
  })
})

interface FakeRect {
  left: number
  top: number
  right: number
  bottom: number
  width: number
  height: number
}

function fakeRect(left: number, top: number, right: number, bottom: number): FakeRect {
  return { left, top, right, bottom, width: right - left, height: bottom - top }
}

function makePage(
  root: HTMLElement,
  pageNumber: number,
  rect: { left: number; top: number; right: number; bottom: number },
): HTMLElement {
  const page = document.createElement("div")
  page.className = "react-pdf__Page"
  page.dataset.pageNumber = String(pageNumber)
  const layer = document.createElement("div")
  layer.className = "react-pdf__Page__textContent"
  layer.innerHTML = "<span>text</span>"
  page.appendChild(layer)
  root.appendChild(page)
  page.getBoundingClientRect = () =>
    ({
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.right - rect.left,
      height: rect.bottom - rect.top,
    }) as unknown as DOMRect
  return page
}

function fakeSelection(root: HTMLElement, ranges: FakeRect[][], anchorInside = true): Selection {
  const anchorNode = anchorInside
    ? root.querySelector(".react-pdf__Page__textContent span")!.firstChild!
    : document.createElement("div")
  return {
    rangeCount: ranges.length,
    isCollapsed: ranges.length === 0,
    anchorNode,
    focusNode: anchorNode,
    getRangeAt: (i: number) =>
      ({
        getClientRects: () => ranges[i],
      }) as unknown as Range,
  } as unknown as Selection
}

function selectionBoxes(page: HTMLElement): HTMLElement[] {
  return Array.from(page.children).flatMap((child) =>
    child.classList.contains("pdf-selection-overlay") ? Array.from(child.children) : [],
  ) as HTMLElement[]
}

describe("paintSelection", () => {
  it("paints one merged bar for fragments split across font runs", () => {
    const root = document.createElement("div")
    const page = makePage(root, 1, { left: 0, top: 0, right: 500, bottom: 700 })
    paintSelection(
      root,
      fakeSelection(root, [[fakeRect(50, 100, 120, 114), fakeRect(120, 101, 200, 114)]]),
    )
    const boxes = selectionBoxes(page)
    expect(boxes).toHaveLength(1)
    expect(boxes[0].className).toBe("pdf-selection-box")
    expect(boxes[0].style.left).toBe("50px")
    expect(boxes[0].style.width).toBe("150px")
  })

  it("rounds outward so no selected edge is left uncovered", () => {
    const root = document.createElement("div")
    const page = makePage(root, 1, { left: 10, top: 20, right: 510, bottom: 720 })
    paintSelection(root, fakeSelection(root, [[fakeRect(60.4, 100.7, 199.2, 113.3)]]))
    const boxes = selectionBoxes(page)
    expect(boxes).toHaveLength(1)
    expect(boxes[0].style.left).toBe("50px")
    expect(boxes[0].style.top).toBe("80px")
    expect(boxes[0].style.width).toBe("140px")
    expect(boxes[0].style.height).toBe("14px")
  })

  it("buckets fragments into their pages by center point", () => {
    const root = document.createElement("div")
    const first = makePage(root, 1, { left: 0, top: 0, right: 500, bottom: 700 })
    const second = makePage(root, 2, { left: 0, top: 716, right: 500, bottom: 1416 })
    paintSelection(
      root,
      fakeSelection(root, [[fakeRect(50, 600, 400, 614), fakeRect(50, 800, 400, 814)]]),
    )
    expect(selectionBoxes(first)).toHaveLength(1)
    expect(selectionBoxes(second)).toHaveLength(1)
    expect(selectionBoxes(second)[0].style.top).toBe("84px")
  })

  it("ignores rects outside any page and degenerate rects", () => {
    const root = document.createElement("div")
    const page = makePage(root, 1, { left: 0, top: 0, right: 500, bottom: 700 })
    paintSelection(
      root,
      fakeSelection(root, [[fakeRect(600, 100, 700, 114), fakeRect(50, 100, 50, 114)]]),
    )
    expect(selectionBoxes(page)).toHaveLength(0)
    expect(page.querySelector(".pdf-selection-overlay")).toBeNull()
  })

  it("does not churn the DOM when the selection is unchanged", () => {
    const root = document.createElement("div")
    const page = makePage(root, 1, { left: 0, top: 0, right: 500, bottom: 700 })
    const sel = fakeSelection(root, [[fakeRect(50, 100, 200, 114)]])
    paintSelection(root, sel)
    const overlay = Array.from(page.children).find((c) =>
      c.classList.contains("pdf-selection-overlay"),
    )!
    const firstBox = overlay.firstChild
    paintSelection(root, sel)
    expect(overlay.firstChild).toBe(firstBox)
  })

  it("clears overlays when the selection collapses", () => {
    const root = document.createElement("div")
    const page = makePage(root, 1, { left: 0, top: 0, right: 500, bottom: 700 })
    paintSelection(root, fakeSelection(root, [[fakeRect(50, 100, 200, 114)]]))
    expect(selectionBoxes(page)).toHaveLength(1)
    paintSelection(root, fakeSelection(root, []))
    expect(page.querySelector(".pdf-selection-overlay")).toBeNull()
  })

  it("clears overlays when the selection moves outside the viewer", () => {
    const root = document.createElement("div")
    const page = makePage(root, 1, { left: 0, top: 0, right: 500, bottom: 700 })
    paintSelection(root, fakeSelection(root, [[fakeRect(50, 100, 200, 114)]]))
    expect(selectionBoxes(page)).toHaveLength(1)
    paintSelection(root, fakeSelection(root, [[fakeRect(50, 100, 200, 114)]], false))
    expect(page.querySelector(".pdf-selection-overlay")).toBeNull()
  })

  it("leaves the text layer DOM untouched", () => {
    const root = document.createElement("div")
    makePage(root, 1, { left: 0, top: 0, right: 500, bottom: 700 })
    paintSelection(root, fakeSelection(root, [[fakeRect(50, 100, 200, 114)]]))
    const layer = root.querySelector(".react-pdf__Page__textContent")!
    expect(layer.innerHTML).toBe("<span>text</span>")
  })
})

describe("clearSelectionOverlays", () => {
  it("is a no-op when nothing was painted", () => {
    const root = document.createElement("div")
    makePage(root, 1, { left: 0, top: 0, right: 500, bottom: 700 })
    expect(() => clearSelectionOverlays(root)).not.toThrow()
    expect(root.querySelector(".pdf-selection-overlay")).toBeNull()
  })
})

describe("charFractions", () => {
  it("maps uniform advances to even fractions", () => {
    expect(charFractions("abcd", (prefix) => prefix.length * 10)).toEqual([0, 0.25, 0.5, 0.75, 1])
  })

  it("follows uneven advances", () => {
    const widths: Record<string, number> = { a: 5, ab: 15, abc: 18, abcd: 26 }
    expect(charFractions("abcd", (prefix) => widths[prefix])).toEqual([
      0,
      5 / 26,
      15 / 26,
      18 / 26,
      1,
    ])
  })

  it("falls back to uniform fractions for zero total", () => {
    expect(charFractions("ab", () => 0)).toEqual([0, 0.5, 1])
  })

  it("handles empty text", () => {
    expect(charFractions("", () => 0)).toEqual([0])
  })
})

describe("boxesForSpanIntervals", () => {
  const fracs = [0, 0.25, 0.5, 0.75, 1]

  it("places box edges on glyph boundaries", () => {
    expect(
      boxesForSpanIntervals({ left: 100, top: 50, right: 300, bottom: 64 }, fracs, [
        { start: 1, end: 3 },
      ]),
    ).toEqual([{ left: 150, top: 50, right: 250, bottom: 64 }])
  })

  it("rounds outward to cover edge glyphs fully", () => {
    const boxes = boxesForSpanIntervals(
      { left: 100.6, top: 50.2, right: 299.8, bottom: 64 },
      [0, 0.33, 1],
      [{ start: 0, end: 2 }],
    )
    expect(boxes).toEqual([{ left: 100, top: 50, right: 300, bottom: 64 }])
  })

  it("clamps intervals to the span text", () => {
    expect(
      boxesForSpanIntervals({ left: 0, top: 0, right: 100, bottom: 10 }, fracs, [
        { start: -5, end: 99 },
      ]),
    ).toEqual([{ left: 0, top: 0, right: 100, bottom: 10 }])
  })

  it("skips empty intervals", () => {
    expect(
      boxesForSpanIntervals({ left: 0, top: 0, right: 100, bottom: 10 }, fracs, [
        { start: 2, end: 2 },
      ]),
    ).toEqual([])
  })
})

describe("leafSpans", () => {
  it("flattens markedContent wrappers in DOM order and skips breaks", () => {
    const layer = document.createElement("div")
    layer.className = "react-pdf__Page__textContent"
    layer.innerHTML =
      '<span class="markedContent"><span>a</span><br><span>b</span></span><span>c</span><div class="endOfContent"></div>'
    expect(leafSpans(layer).map((s) => s.textContent)).toEqual(["a", "b", "c"])
  })
})

function realSelection(root: HTMLElement, ranges: Range[]): Selection {
  return {
    rangeCount: ranges.length,
    isCollapsed: false,
    anchorNode: root,
    focusNode: root,
    getRangeAt: (i: number) => ranges[i],
  } as unknown as Selection
}

describe("spanIntervals", () => {
  it("maps a substring range to char offsets", () => {
    const root = document.createElement("div")
    root.innerHTML = "<span>Kontekst podatka</span>"
    const span = root.querySelector("span")!
    const range = document.createRange()
    range.setStart(span.firstChild!, 0)
    range.setEnd(span.firstChild!, 9)
    expect(spanIntervals(span, realSelection(root, [range]))).toEqual([{ start: 0, end: 9 }])
  })

  it("lets endpoints outside the span overflow for downstream clamping", () => {
    const root = document.createElement("div")
    root.innerHTML = "<span>ab</span><span>cd</span>"
    const [first, second] = Array.from(root.querySelectorAll("span"))
    const range = document.createRange()
    range.setStart(first.firstChild!, 1)
    range.setEnd(second.firstChild!, 1)
    // Raw offsets can exceed the span; boxesForSpanIntervals clamps them.
    expect(spanIntervals(first, realSelection(root, [range]))).toEqual([{ start: 1, end: 3 }])
    expect(spanIntervals(second, realSelection(root, [range]))).toEqual([{ start: 0, end: 1 }])
  })

  it("resolves element boundary points inside wrappers", () => {
    const root = document.createElement("div")
    root.innerHTML = '<span class="markedContent"><span>ab</span><span>cd</span></span>'
    const inner = root.querySelectorAll(".markedContent span")
    const range = document.createRange()
    range.setStart(root.querySelector(".markedContent")!, 1)
    range.setEnd(inner[1].firstChild!, 2)
    expect(spanIntervals(inner[1] as HTMLElement, realSelection(root, [range]))).toEqual([
      { start: 0, end: 2 },
    ])
  })

  it("returns no intervals for untouched spans", () => {
    const root = document.createElement("div")
    root.innerHTML = "<span>ab</span><span>cd</span>"
    const [first, second] = Array.from(root.querySelectorAll("span"))
    const range = document.createRange()
    range.setStart(first.firstChild!, 0)
    range.setEnd(first.firstChild!, 2)
    expect(spanIntervals(second, realSelection(root, [range]))).toEqual([])
  })
})
