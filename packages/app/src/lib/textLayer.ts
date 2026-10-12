import { findAll } from "@index/shared"

const LAYER_SELECTOR = ".react-pdf__Page__textContent"
const PAGE_SELECTOR = ".react-pdf__Page"
const OVERLAY_CLASS = "search-hit-overlay"
const HIGHLIGHT_CLASS = "search-hit"
const SELECTION_OVERLAY_CLASS = "pdf-selection-overlay"
const SELECTION_BOX_CLASS = "pdf-selection-box"

export function getTextLayer(root: HTMLElement, pageNumber: number): HTMLElement | null {
  return root.querySelector(`.react-pdf__Page[data-page-number="${pageNumber}"] ${LAYER_SELECTOR}`)
}

/** Highlight overlay boxes belonging to `layer`'s page, in DOM order. */
export function getMatchHighlights(layer: HTMLElement): HTMLElement[] {
  const page = layer.parentElement
  if (!page) return []
  return Array.from(page.querySelectorAll<HTMLElement>(`.${OVERLAY_CLASS} .${HIGHLIGHT_CLASS}`))
}

/** Highlights ordered by visual position (top-to-bottom, then left-to-right)
 *  instead of DOM order, which pdfjs does not guarantee to match reading
 *  order on multi-column or math-heavy pages. */
export function getOrderedHighlights(layer: HTMLElement): HTMLElement[] {
  const highlights = getMatchHighlights(layer)
  if (highlights.length < 2) return highlights
  return highlights
    .map((el) => ({ el, rect: el.getBoundingClientRect() }))
    .sort((a, b) => {
      const dy = a.rect.top - b.rect.top
      if (Math.abs(dy) > 1) return dy
      return a.rect.left - b.rect.left
    })
    .map(({ el }) => el)
}

/** Removes `layer`'s page's highlight overlay. The text layer DOM is never
 *  touched, so no text nodes need to be stitched back together. */
export function clearHighlights(layer: HTMLElement): void {
  const overlay = layer.parentElement?.querySelector<HTMLElement>(`.${OVERLAY_CLASS}`)
  overlay?.remove()
}

interface LayerNode {
  node: Text
  start: number
  end: number
  /** The node's span's rendered rect, viewport-relative. */
  rect: DOMRect
  /** The node's span's computed font size. */
  fontSize: number
}

/** Every text node in the layer, in DOM order, with offsets into the
 *  concatenated layer text.
 *
 *  Adjacent nodes that sit a real horizontal or vertical gap apart are joined
 *  with an implicit separator (a space, or a newline for a line break) in the
 *  concatenated string only, never in the DOM. pdf.js renders visually
 *  distinct words as separate spans with no literal space character when the
 *  separation comes from positioning, so without this a find pass could fuse
 *  two real words into a false match. Mid-word splits from separate
 *  text-show operators have a ~zero gap and stay joined, which is what the
 *  cross-span matching relies on. */
function collectLayerNodes(layer: HTMLElement): { nodes: LayerNode[]; text: string } {
  const nodes: LayerNode[] = []
  let text = ""
  let prevSpan: HTMLElement | null = null
  let prevRect: DOMRect | null = null
  let prevLastChar = ""

  for (const span of layer.querySelectorAll<HTMLElement>("span")) {
    const rect = span.getBoundingClientRect()
    const fontSize = parseFloat(getComputedStyle(span).fontSize) || 16
    for (const child of span.childNodes) {
      if (child.nodeType !== Node.TEXT_NODE) continue
      const content = child.textContent ?? ""
      if (content.length === 0) continue
      if (
        prevSpan &&
        prevSpan !== span &&
        prevRect &&
        !/\s/.test(prevLastChar) &&
        !/\s/.test(content[0])
      ) {
        const sameLine = Math.abs(rect.top - prevRect.top) <= fontSize * 0.6
        if (sameLine ? rect.left - prevRect.right > fontSize * 0.2 : rect.top > prevRect.top) {
          text += sameLine ? " " : "\n"
        }
      }
      nodes.push({
        node: child as Text,
        start: text.length,
        end: text.length + content.length,
        rect,
        fontSize,
      })
      text += content
      prevSpan = span
      prevRect = rect
      prevLastChar = content[content.length - 1]
    }
  }
  return { nodes, text }
}

interface RectBox {
  left: number
  right: number
  top: number
  bottom: number
}

/** A rendered overlay box, in layer-relative coordinates. */
interface Box {
  left: number
  top: number
  width: number
  height: number
}

/** Geometry of one logical match: one rect per text node the match touches,
 *  merged into one box per visual line.
 *
 *  The per-node rect comes from the span's own getBoundingClientRect() when
 *  the match covers the whole node, else from a Range spanning exactly the
 *  matched fragment of that node.
 *
 *  pdf.js's spans are position: absolute and each is its own formatting box,
 *  so the browser will never coalesce same-line fragments itself (this is why
 *  Range.getClientRects() returns one rect per span, not one per line), so we
 *  cluster fragments by visual line manually and merge each cluster into its
 *  union box, using the same vertical tolerance as collectLayerNodes'
 *  sameLine heuristic. */
function boxesForMatch(nodes: LayerNode[], start: number, end: number, layerRect: DOMRect): Box[] {
  const fragments: Array<{ rect: DOMRect; fontSize: number }> = []
  const range = document.createRange()
  let ni = 0
  while (ni < nodes.length && nodes[ni].end <= start) ni++
  for (let j = ni; j < nodes.length && nodes[j].start < end; j++) {
    const { node, start: nodeStart, end: nodeEnd, rect: nodeRect, fontSize } = nodes[j]
    const from = Math.max(start, nodeStart)
    const to = Math.min(end, nodeEnd)
    if (to <= from) continue
    let rect: DOMRect
    if (from === nodeStart && to === nodeEnd) {
      rect = nodeRect
    } else {
      range.setStart(node, from - nodeStart)
      range.setEnd(node, to - nodeStart)
      rect = range.getBoundingClientRect()
    }
    if (rect.width <= 0 || rect.height <= 0) continue
    fragments.push({ rect, fontSize })
  }

  fragments.sort((a, b) => a.rect.top - b.rect.top)
  const merged: RectBox[] = []
  for (const { rect, fontSize } of fragments) {
    const last = merged[merged.length - 1]
    if (last && Math.abs(rect.top - last.top) <= fontSize * 0.6) {
      last.left = Math.min(last.left, rect.left)
      last.right = Math.max(last.right, rect.right)
      last.top = Math.min(last.top, rect.top)
      last.bottom = Math.max(last.bottom, rect.bottom)
    } else {
      merged.push({ left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom })
    }
  }

  return merged.map((b) => ({
    left: Math.round(b.left - layerRect.left),
    top: Math.round(b.top - layerRect.top),
    width: Math.round(b.right - b.left),
    height: Math.round(b.bottom - b.top),
  }))
}

/** Highlights every occurrence of `query` in the layer by painting one
 *  positioned overlay box per visual line per match into a sibling of the
 *  text layer. Matching runs once over the concatenated layer text, so
 *  occurrences that pdf.js splits across text nodes or spans are still
 *  found; each fragment's rect is merged with same-line neighbours into a
 *  single clean bar. The text layer DOM is never mutated. Returns the
 *  number of matches painted. */
export function highlightMatches(layer: HTMLElement, query: string): number {
  clearHighlights(layer)
  if (!query.trim()) return 0

  const { nodes, text } = collectLayerNodes(layer)
  if (text.trim().length === 0) return 0

  const matches = findAll(text, query)
  if (matches.length === 0) return 0

  const page = layer.parentElement
  if (!page) return 0

  const layerRect = layer.getBoundingClientRect()
  const overlay = document.createElement("div")
  overlay.className = OVERLAY_CLASS
  page.appendChild(overlay)
  let count = 0
  for (const { start, end } of matches) {
    let boxes = 0
    for (const box of boxesForMatch(nodes, start, end, layerRect)) {
      const el = document.createElement("div")
      el.className = HIGHLIGHT_CLASS
      el.style.left = `${box.left}px`
      el.style.top = `${box.top}px`
      el.style.width = `${box.width}px`
      el.style.height = `${box.height}px`
      overlay.appendChild(el)
      boxes++
    }
    if (boxes > 0) count++
  }
  return count
}

/** A viewport-relative rect (client coordinates), e.g. one entry of
 *  `Range.getClientRects()`. Right/bottom edges are exclusive. */
export interface SelectionRect {
  left: number
  top: number
  right: number
  bottom: number
}

/** Merge per-fragment selection rects into one continuous bar per visual
 *  line.
 *
 *  pdf.js renders each font run as its own absolutely positioned span with a
 *  fallback font stretched by scaleX, so the browser's native selection
 *  paints one background box per span and leaves the gaps between runs (word
 *  spaces at run boundaries, mixed bold/italic fragments, per-word splits)
 *  unpainted even though they are logically selected. Merging same-line
 *  fragments into their union box covers every selected glyph with a single
 *  Drive-style bar.
 *
 *  Fragments cluster by vertical overlap (not top proximity), so mixed-size
 *  runs on one line still fuse while adjacent lines stay apart. The overlap
 *  threshold is a fraction of the smaller height, so the rule scales with
 *  zoom and needs no style reads in the hot path. Horizontal gaps are always
 *  bridged, including multi-column gutters, which matches how continuous
 *  prose selection is expected to look. */
export function mergeSelectionRects(rects: SelectionRect[]): SelectionRect[] {
  const valid = rects.filter((r) => r.right - r.left > 0.25 && r.bottom - r.top > 0.25)
  valid.sort((a, b) => a.top - b.top || a.left - b.left)
  const merged: SelectionRect[] = []
  for (const rect of valid) {
    const last = merged[merged.length - 1]
    const overlap = last ? Math.min(last.bottom, rect.bottom) - Math.max(last.top, rect.top) : 0
    const threshold = last ? Math.min(last.bottom - last.top, rect.bottom - rect.top) * 0.25 : 0
    if (last && overlap >= threshold) {
      last.left = Math.min(last.left, rect.left)
      last.right = Math.max(last.right, rect.right)
      last.top = Math.min(last.top, rect.top)
      last.bottom = Math.max(last.bottom, rect.bottom)
    } else {
      merged.push({ left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom })
    }
  }
  return merged
}

/** Pages that currently own a selection overlay. Lets the empty-selection
 *  fast path skip the DOM walk entirely, so caret moves in unrelated inputs
 *  cost one contains check and nothing else. */
const paintedSelectionRoots = new WeakSet<HTMLElement>()

function findSelectionOverlay(page: HTMLElement): HTMLElement | null {
  for (const child of page.children) {
    if (child.classList.contains(SELECTION_OVERLAY_CLASS)) return child as HTMLElement
  }
  return null
}

/** Removes every selection overlay under `root`. Cheap no-op when nothing
 *  was painted. The text layer DOM is never touched. */
export function clearSelectionOverlays(root: HTMLElement): void {
  if (!paintedSelectionRoots.has(root)) return
  paintedSelectionRoots.delete(root)
  for (const overlay of root.querySelectorAll<HTMLElement>(`.${SELECTION_OVERLAY_CLASS}`)) {
    overlay.remove()
  }
}

/** Cumulative per-character advance fractions for `text`, measured with
 *  `measure` (a canvas measureText width for a string prefix). Entry i is
 *  the fraction of the total advance consumed by the first i UTF-16 code
 *  units, so fracs[0] is 0 and fracs[text.length] is 1. Prefix-diff measuring
 *  keeps kerning and ligatures shaped the way fillText shapes them. Pure and
 *  canvas-agnostic for testability; the caller owns measureText. */
export function charFractions(text: string, measure: (prefix: string) => number): number[] {
  const fracs = new Array<number>(text.length + 1)
  fracs[0] = 0
  if (text.length === 0) return fracs
  const widths = new Array<number>(text.length + 1)
  widths[0] = 0
  for (let i = 1; i <= text.length; i++) {
    widths[i] = measure(text.slice(0, i))
  }
  const total = widths[text.length]
  if (!(total > 0)) {
    for (let i = 1; i <= text.length; i++) fracs[i] = i / text.length
    return fracs
  }
  for (let i = 1; i <= text.length; i++) fracs[i] = widths[i] / total
  return fracs
}

/** A selected character range within one span, as UTF-16 offsets. Endpoints
 *  outside the span yield raw overflowing offsets; boxesForSpanIntervals
 *  clamps them. */
export interface SpanInterval {
  start: number
  end: number
}

/** Boxes for selected char intervals within one span, in page-relative
 *  coordinates rounded outward. `fracs` comes from charFractions over the
 *  span's full text, so each box edge lands on a true glyph boundary of the
 *  PDF font instead of the fallback font the browser's Range rects assume.
 *  Pure for testability. */
export function boxesForSpanIntervals(
  span: SelectionRect,
  fracs: number[],
  intervals: SpanInterval[],
): SelectionRect[] {
  const spanWidth = span.right - span.left
  const textLength = fracs.length - 1
  const boxes: SelectionRect[] = []
  for (const { start, end } of intervals) {
    const from = Math.max(0, Math.min(start, textLength))
    const to = Math.max(0, Math.min(end, textLength))
    if (to <= from) continue
    boxes.push({
      left: Math.floor(span.left + spanWidth * fracs[from]),
      top: Math.floor(span.top),
      right: Math.ceil(span.left + spanWidth * fracs[to]),
      bottom: Math.ceil(span.bottom),
    })
  }
  return boxes
}

/** Minimal structural view of the pdf.js document proxy the viewer already
 *  holds. Only getTextContent per page is needed, to learn each text run's
 *  real PDF font (the text layer itself only carries the fallback family). */
export interface PdfDocumentLike {
  getPage(pageNumber: number): Promise<{ getTextContent(): Promise<{ items: unknown[] }> }>
}

export interface TextRun {
  text: string
  fontName: string
}

let itemsDocUrl: string | null = null
let pdfDoc: PdfDocumentLike | null = null
const pageItemsCache = new Map<number, TextRun[]>()
const pageItemsInflight = new Map<number, Promise<void>>()

/** Hands the loaded pdf.js document to the selection painter. Called from
 *  the viewer's onLoadSuccess, which already has the proxy. Cached per URL;
 *  switching documents drops the previous one's entries. */
export function registerPdfDocument(url: string, pdf: PdfDocumentLike): void {
  if (itemsDocUrl !== url) {
    itemsDocUrl = url
    pageItemsCache.clear()
    pageItemsInflight.clear()
    spanGeometryCache = new WeakMap()
  }
  pdfDoc = pdf
}

function readTextRun(item: unknown): TextRun | null {
  if (typeof item !== "object" || item === null) return null
  const record = item as Record<string, unknown>
  if (typeof record.str !== "string" || record.str.length === 0) return null
  if (typeof record.fontName !== "string") return null
  return { text: record.str, fontName: record.fontName }
}

/** Non-empty text runs of a page in text layer order (verified 1:1 with the
 *  layer's leaf spans). Resolves false while loading or unavailable. */
function cachedPageRuns(pageNumber: number): TextRun[] | null {
  return pageItemsCache.get(pageNumber) ?? null
}

/** Kicks off a background getTextContent for the page and repaints `root`
 *  when it lands. Paints in the meantime use the Range-rect fallback, so
 *  this never blocks the hot path. */
function ensurePageRuns(root: HTMLElement, pageNumber: number): void {
  if (pageItemsCache.has(pageNumber) || pageItemsInflight.has(pageNumber)) return
  if (!pdfDoc) return
  const doc = pdfDoc
  const pending = doc
    .getPage(pageNumber)
    .then((pg) => pg.getTextContent())
    .then(
      (tc) => {
        const runs: TextRun[] = []
        for (const item of tc.items) {
          const run = readTextRun(item)
          if (run) runs.push(run)
        }
        pageItemsCache.set(pageNumber, runs)
      },
      () => {
        pageItemsCache.set(pageNumber, [])
      },
    )
    .then(() => {
      pageItemsInflight.delete(pageNumber)
      paintSelection(root)
    })
  pageItemsInflight.set(pageNumber, pending)
}

/** Leaf text spans of a layer in DOM order, descending into markedContent
 *  wrappers. pdf.js emits exactly one leaf span per non-empty text item in
 *  the same order, which is what pairs spans with their real PDF fonts. */
export function leafSpans(layer: HTMLElement): HTMLElement[] {
  const out: HTMLElement[] = []
  const walk = (node: Node): void => {
    for (const child of node.childNodes) {
      if (!(child instanceof HTMLElement)) continue
      const el = child
      if (el.tagName === "BR") continue
      if (el.tagName === "SPAN" && el.classList.contains("markedContent")) {
        walk(el)
        continue
      }
      if (el.tagName === "SPAN") {
        out.push(el)
        continue
      }
      walk(el)
    }
  }
  walk(layer)
  return out
}

interface SpanGeometry {
  text: string
  size: number
  font: string
  fracs: number[]
}

let spanGeometryCache = new WeakMap<HTMLElement, SpanGeometry>()
let measureContext: CanvasRenderingContext2D | null | undefined

function getMeasureContext(): CanvasRenderingContext2D | null {
  if (measureContext === undefined) {
    measureContext = document.createElement("canvas").getContext("2d")
  }
  return measureContext
}

/** Whole-string advance totals for every generic family candidate. The
 *  text layer's computed family is always the fallback, so each span is
 *  matched against the generic families in both weights and styles and
 *  the closest total to the span's exact (scaleX-stretched,
 *  canvas-matching) width wins. Stateless per span; a short-span mis-pick
 *  is bounded to a few pixels by the span's own width. */
const MEASURE_FAMILIES = ["serif", "sans-serif", "monospace"] as const
const MEASURE_WEIGHTS = ["400", "700"] as const
const MEASURE_STYLES = ["normal", "italic"] as const

function pickMeasureFont(
  ctx: CanvasRenderingContext2D,
  text: string,
  size: number,
  spanWidth: number,
): string {
  let best = `${size}px serif`
  let bestError = Number.POSITIVE_INFINITY
  for (const family of MEASURE_FAMILIES) {
    for (const weight of MEASURE_WEIGHTS) {
      for (const style of MEASURE_STYLES) {
        const font = `${style} ${weight} ${size}px ${family}`
        ctx.font = font
        const error = Math.abs(ctx.measureText(text).width - spanWidth)
        if (error < bestError) {
          bestError = error
          best = font
        }
      }
    }
  }
  return best
}

/** Glyph-advance fractions for a span, cached per span element. Fractions
 *  are width-independent, so zoom and pinch transforms need no cache
 *  invalidation; text or size changes rebuild. Returns null when the span
 *  cannot be measured (no canvas, empty text, zero width). */
function getSpanGeometry(span: HTMLElement, rect: DOMRect): SpanGeometry | null {
  const text = span.textContent ?? ""
  if (text.length === 0 || rect.width <= 0) return null
  const size = parseFloat(getComputedStyle(span).fontSize) || 16
  const cached = spanGeometryCache.get(span)
  if (cached && cached.text === text && cached.size === size) return cached
  const ctx = getMeasureContext()
  if (!ctx) return null
  const font = pickMeasureFont(ctx, text, size, rect.width)
  ctx.font = font
  const fracs = charFractions(text, (prefix) => ctx.measureText(prefix).width)
  const geometry: SpanGeometry = { text, size, font, fracs }
  spanGeometryCache.set(span, geometry)
  return geometry
}

/** UTF-16 offset of a selection boundary point measured from the start of
 *  `span`. Text-node points (the common case for caret, drag and keyboard
 *  selections) resolve by direct offset math without touching the Range
 *  comparison API, which misorders text-node against element boundaries in
 *  some browsers. Element points (block-level range ends, wrapper
 *  boundaries) fall back to counting rendered characters with a probe
 *  range, which stays exact because the caller only asks for points inside
 *  an intersecting span and clamps the result. */
function pointOffsetInSpan(span: HTMLElement, container: Node, offset: number): number {
  if (container.nodeType === Node.TEXT_NODE && span.contains(container)) {
    let total = 0
    for (const child of span.childNodes) {
      if (child === container) return total + offset
      if (child.nodeType === Node.TEXT_NODE) total += child.textContent?.length ?? 0
    }
  }
  const first = span.firstChild
  if (!first) return 0
  const probe = document.createRange()
  probe.setStart(first, 0)
  try {
    probe.setEnd(container, offset)
  } catch {
    return 0
  }
  return probe.toString().length
}

/** Selected char intervals of `span` for every selection range touching it.
 *  Ranges fully before or after the span never intersect it and are
 *  skipped. Endpoints outside the span yield raw overflowing offsets (a
 *  probe ending before the span start collapses to zero); boxesForSpan-
 *  Intervals clamps them. Deliberately uses no boundary comparisons, only
 *  intersectsNode plus character counting. */
export function spanIntervals(span: HTMLElement, sel: Selection): SpanInterval[] {
  const length = span.textContent?.length ?? 0
  if (length === 0) return []
  const intervals: SpanInterval[] = []
  for (let i = 0; i < sel.rangeCount; i++) {
    const range = sel.getRangeAt(i)
    if (typeof range.intersectsNode !== "function" || !range.intersectsNode(span)) continue
    const start = pointOffsetInSpan(span, range.startContainer, range.startOffset)
    const end = pointOffsetInSpan(span, range.endContainer, range.endOffset)
    if (end > start) intervals.push({ start, end })
  }
  return intervals
}

/** Glyph-accurate boxes for every selected span of a layer, in
 *  page-relative coordinates. Returns null when the layer cannot use the
 *  glyph path (runs not loaded yet, span/run count mismatch, or the Range
 *  API surface needed for offset mapping is missing), in which case the
 *  caller falls back to Range rects. */
function glyphBoxesForLayer(
  layer: HTMLElement,
  pageRect: DOMRect,
  runs: TextRun[] | null,
  sel: Selection,
): SelectionRect[] | null {
  if (!runs) return null
  if (typeof document.createRange !== "function") return null
  const spans = leafSpans(layer)
  if (spans.length !== runs.length) return null
  const boxes: SelectionRect[] = []
  let touched = false
  for (let i = 0; i < spans.length; i++) {
    const span = spans[i]
    const intervals = spanIntervals(span, sel)
    if (intervals.length === 0) continue
    touched = true
    const rect = span.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) continue
    const geometry = getSpanGeometry(span, rect)
    if (!geometry || geometry.text !== runs[i].text) continue
    for (const box of boxesForSpanIntervals(
      {
        left: rect.left - pageRect.left,
        top: rect.top - pageRect.top,
        right: rect.right - pageRect.left,
        bottom: rect.bottom - pageRect.top,
      },
      geometry.fracs,
      intervals,
    )) {
      boxes.push(box)
    }
  }
  // Selected content that cannot be measured (no canvas in some test
  // environments) falls back to Range rects instead of painting nothing.
  if (boxes.length === 0 && touched) return null
  return boxes
}

/** Range-rect boxes for a page, in page-relative coordinates rounded
 *  outward. Used until the page's text runs load, and wherever the glyph
 *  path cannot apply. */
function rectBoxesForPage(pageRect: DOMRect, sel: Selection): SelectionRect[] {
  const boxes: SelectionRect[] = []
  for (let i = 0; i < sel.rangeCount; i++) {
    let list: ArrayLike<DOMRect>
    try {
      list = sel.getRangeAt(i).getClientRects()
    } catch {
      continue
    }
    for (const rect of Array.from(list)) {
      if (rect.width <= 0.25 || rect.height <= 0.25) continue
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      if (cx < pageRect.left || cx > pageRect.right || cy < pageRect.top || cy > pageRect.bottom) {
        continue
      }
      boxes.push({
        left: Math.floor(rect.left - pageRect.left),
        top: Math.floor(rect.top - pageRect.top),
        right: Math.ceil(rect.right - pageRect.left),
        bottom: Math.ceil(rect.bottom - pageRect.top),
      })
    }
  }
  return boxes
}

/** Paint the user's native text selection as per-line overlay bars.
 *
 *  The native `::selection` background is suppressed by CSS (it assumes the
 *  text layer's fallback font metrics and leaves visible gaps), while the
 *  real Selection is left intact so copy, drag and touch handles keep
 *  working. Per selected span the box edges come from the span's own exact
 *  geometry and glyph-advance fractions measured with a matching font, so
 *  every selected character is covered exactly where the canvas drew it;
 *  same-line fragments merge into one continuous bar. Until a page's text
 *  runs load (or wherever the glyph path cannot apply), Range rects are
 *  used as a fallback. Overlays are diffed by a coordinate signature so
 *  repeated paints during a drag do not churn the DOM.
 *
 *  Coordinate math uses client rects on both sides, so scroll, zoom and the
 *  pinch cssScale transform stay correct without extra bookkeeping. */
export function paintSelection(root: HTMLElement, selection?: Selection | null): void {
  const sel = selection === undefined ? document.getSelection() : selection
  const anchorInside = !!sel?.anchorNode && !!root.contains(sel.anchorNode)
  const focusInside = !!sel?.focusNode && !!root.contains(sel.focusNode)
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed || (!anchorInside && !focusInside)) {
    clearSelectionOverlays(root)
    return
  }

  const pageEls = root.querySelectorAll<HTMLElement>(PAGE_SELECTOR)
  const pages: Array<{ el: HTMLElement; rect: DOMRect; layer: HTMLElement | null; num: number }> =
    []
  for (const el of pageEls) {
    const rect = el.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) continue
    pages.push({
      el,
      rect,
      layer: el.querySelector<HTMLElement>(LAYER_SELECTOR),
      num: Number(el.dataset.pageNumber) || 0,
    })
  }
  if (pages.length === 0) {
    clearSelectionOverlays(root)
    return
  }

  let painted = false
  for (const page of pages) {
    const existing = findSelectionOverlay(page.el)
    let boxes: SelectionRect[]
    if (page.layer) {
      const runs = page.num > 0 ? cachedPageRuns(page.num) : null
      if (page.num > 0 && !runs) ensurePageRuns(root, page.num)
      const glyphBoxes = runs ? glyphBoxesForLayer(page.layer, page.rect, runs, sel) : null
      boxes = glyphBoxes ?? rectBoxesForPage(page.rect, sel)
    } else {
      boxes = rectBoxesForPage(page.rect, sel)
    }
    if (boxes.length === 0) {
      existing?.remove()
      continue
    }
    const merged = mergeSelectionRects(boxes)
    if (merged.length === 0) {
      existing?.remove()
      continue
    }
    const signature = merged.map((b) => `${b.left},${b.top},${b.right},${b.bottom}`).join(";")
    const overlay = existing ?? document.createElement("div")
    if (!existing) {
      overlay.className = SELECTION_OVERLAY_CLASS
      page.el.appendChild(overlay)
    }
    if (overlay.dataset.signature !== signature) {
      overlay.dataset.signature = signature
      overlay.replaceChildren()
      for (const box of merged) {
        const el = document.createElement("div")
        el.className = SELECTION_BOX_CLASS
        el.style.left = `${box.left}px`
        el.style.top = `${box.top}px`
        el.style.width = `${box.right - box.left}px`
        el.style.height = `${box.bottom - box.top}px`
        overlay.appendChild(el)
      }
    }
    painted = true
  }

  if (painted) paintedSelectionRoots.add(root)
  else clearSelectionOverlays(root)
}
