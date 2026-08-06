import { findAll } from "@index/shared"

const LAYER_SELECTOR = ".react-pdf__Page__textContent"
const MARK_SELECTOR = "mark.search-hit"

export function getTextLayer(root: HTMLElement, pageNumber: number): HTMLElement | null {
  return root.querySelector(`.react-pdf__Page[data-page-number="${pageNumber}"] ${LAYER_SELECTOR}`)
}

export function getMatchMarks(layer: HTMLElement): HTMLElement[] {
  return Array.from(layer.querySelectorAll<HTMLElement>(MARK_SELECTOR))
}

/** Replaces every <mark class="search-hit"> in the layer with plain text. */
export function clearHighlights(layer: HTMLElement): void {
  for (const mark of Array.from(layer.querySelectorAll<HTMLElement>(MARK_SELECTOR))) {
    const parent = mark.parentNode
    if (!parent) continue
    parent.replaceChild(document.createTextNode(mark.textContent ?? ""), mark)
  }
}

interface NodeRange {
  node: Text
  from: number
  to: number
}

function collectNodeRanges(span: HTMLElement): NodeRange[] {
  const out: NodeRange[] = []
  let acc = 0
  for (const child of span.childNodes) {
    if (child.nodeType !== Node.TEXT_NODE) continue
    const len = child.textContent?.length ?? 0
    if (len > 0) out.push({ node: child as Text, from: acc, to: acc + len })
    acc += len
  }
  return out
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

/** Wraps every occurrence of `query` in the layer's text spans with
 *  <mark class="search-hit">. Returns the number of matches found. */
export function highlightMatches(layer: HTMLElement, query: string): number {
  clearHighlights(layer)
  if (!query.trim()) return 0

  const byNode = new Map<Text, Array<[number, number]>>()
  let count = 0

  for (const span of layer.querySelectorAll<HTMLElement>("span")) {
    const text = span.textContent ?? ""
    if (!text.trim()) continue
    const matches = findAll(text, query)
    if (matches.length === 0) continue
    const ranges = collectNodeRanges(span)
    if (ranges.length === 0) continue

    for (const match of matches) {
      count++
      for (const range of ranges) {
        if (match.end <= range.from || match.start >= range.to) continue
        const start = Math.max(match.start, range.from) - range.from
        const end = Math.min(match.end, range.to) - range.from
        if (end <= start) continue
        const list = byNode.get(range.node) ?? []
        list.push([start, end])
        byNode.set(range.node, list)
      }
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

  return count
}
