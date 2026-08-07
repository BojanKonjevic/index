import { findAll } from "@index/shared"

const LAYER_SELECTOR = ".react-pdf__Page__textContent"
const MARK_SELECTOR = "mark.search-hit"

export function getTextLayer(root: HTMLElement, pageNumber: number): HTMLElement | null {
  return root.querySelector(`.react-pdf__Page[data-page-number="${pageNumber}"] ${LAYER_SELECTOR}`)
}

export function getMatchMarks(layer: HTMLElement): HTMLElement[] {
  return Array.from(layer.querySelectorAll<HTMLElement>(MARK_SELECTOR))
}

/** Marks ordered by visual position (top-to-bottom, then left-to-right)
 *  instead of DOM order, which pdfjs does not guarantee to match reading
 *  order on multi-column or math-heavy pages. */
export function getOrderedMarks(layer: HTMLElement): HTMLElement[] {
  const marks = getMatchMarks(layer)
  if (marks.length < 2) return marks
  return marks
    .map((mark) => ({ mark, rect: mark.getBoundingClientRect() }))
    .sort((a, b) => {
      const dy = a.rect.top - b.rect.top
      if (Math.abs(dy) > 1) return dy
      return a.rect.left - b.rect.left
    })
    .map(({ mark }) => mark)
}

/** Replaces every <mark class="search-hit"> in the layer with plain text. */
export function clearHighlights(layer: HTMLElement): void {
  for (const mark of Array.from(layer.querySelectorAll<HTMLElement>(MARK_SELECTOR))) {
    const parent = mark.parentNode
    if (!parent) continue
    parent.replaceChild(document.createTextNode(mark.textContent ?? ""), mark)
  }
}

/** Splits `node` at [start, end] (offsets within node text), wrapping the
 *  middle in a <mark class="search-hit">. Returns the node holding the
 *  prefix, so earlier ranges can be applied to it in turn. */
function wrapTextRange(node: Text, start: number, end: number): Text {
  const parent = node.parentNode
  const whole = node.nodeValue ?? ""
  const before = document.createTextNode(whole.slice(0, start))
  const mid = document.createTextNode(whole.slice(start, end))
  const after = document.createTextNode(whole.slice(end))
  const mark = document.createElement("mark")
  mark.className = "search-hit"
  mark.appendChild(mid)
  if (parent) {
    parent.insertBefore(before, node)
    parent.insertBefore(mark, node)
    parent.insertBefore(after, node)
    parent.removeChild(node)
  }
  return before
}

interface LayerNode {
  node: Text
  start: number
  end: number
}

/** Every text node in the layer, in DOM order, with offsets into the
 *  concatenated layer text.
 *
 *  Adjacent nodes that sit a real horizontal or vertical gap apart are joined
 *  with an implicit separator (a space, or a newline for a line break) in the
 *  concatenated string only — never in the DOM. pdf.js renders visually
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
        const fontSize = parseFloat(getComputedStyle(span).fontSize) || 16
        const sameLine = Math.abs(rect.top - prevRect.top) <= fontSize * 0.6
        if (sameLine ? rect.left - prevRect.right > fontSize * 0.2 : rect.top > prevRect.top) {
          text += sameLine ? " " : "\n"
        }
      }
      nodes.push({ node: child as Text, start: text.length, end: text.length + content.length })
      text += content
      prevSpan = span
      prevRect = rect
      prevLastChar = content[content.length - 1]
    }
  }
  return { nodes, text }
}

/** Wraps every occurrence of `query` in the layer's text spans with
 *  <mark class="search-hit">. Matching runs once over the concatenated layer
 *  text, so occurrences that pdf.js splits across text nodes or spans (a
 *  separate text-show operator can land mid-word in kerning-heavy PDFs) are
 *  still found; a logical match may be wrapped in several <mark> elements if
 *  it crosses node boundaries. Returns the number of logical matches. */
export function highlightMatches(layer: HTMLElement, query: string): number {
  clearHighlights(layer)
  if (!query.trim()) return 0

  const { nodes, text } = collectLayerNodes(layer)
  if (text.trim().length === 0) return 0

  const matches = findAll(text, query)
  if (matches.length === 0) return 0

  const byNode = new Map<Text, Array<[number, number]>>()
  let ni = 0
  for (const { start, end } of matches) {
    while (ni < nodes.length && nodes[ni].end <= start) ni++
    for (let j = ni; j < nodes.length && nodes[j].start < end; j++) {
      const { node, start: nodeStart } = nodes[j]
      const from = Math.max(start, nodeStart)
      const to = Math.min(end, nodes[j].end)
      if (to <= from) continue
      const list = byNode.get(node) ?? []
      list.push([from - nodeStart, to - nodeStart])
      byNode.set(node, list)
    }
  }

  for (const [node, ranges] of byNode) {
    ranges.sort((a, b) => a[0] - b[0])
    const merged: Array<[number, number]> = []
    for (const [start, end] of ranges) {
      const last = merged[merged.length - 1]
      if (last && start <= last[1]) last[1] = Math.max(last[1], end)
      else merged.push([start, end])
    }
    let current = node
    for (let i = merged.length - 1; i >= 0; i--) {
      current = wrapTextRange(current, merged[i][0], merged[i][1])
    }
  }

  return matches.length
}
