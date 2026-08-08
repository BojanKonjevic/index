import { findAll } from "@index/shared"

const LAYER_SELECTOR = ".react-pdf__Page__textContent"
const OVERLAY_CLASS = "search-hit-overlay"
const HIGHLIGHT_CLASS = "search-hit"

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
 *  Range.getClientRects() returns one rect per span, not one per line) — we
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
