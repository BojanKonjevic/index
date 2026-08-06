const DIACRITICS_RE = /[\u0300-\u036f]/g

const CYRILLIC_TO_LATIN: Record<string, string> = {
  А: "A",
  а: "a",
  Б: "B",
  б: "b",
  В: "V",
  в: "v",
  Г: "G",
  г: "g",
  Д: "D",
  д: "d",
  Ђ: "Đ",
  ђ: "đ",
  Е: "E",
  е: "e",
  Ж: "Ž",
  ж: "ž",
  З: "Z",
  з: "z",
  И: "I",
  и: "i",
  Ј: "J",
  ј: "j",
  К: "K",
  к: "k",
  Л: "L",
  л: "l",
  Љ: "Lj",
  љ: "lj",
  М: "M",
  м: "m",
  Н: "N",
  н: "n",
  Њ: "Nj",
  њ: "nj",
  О: "O",
  о: "o",
  П: "P",
  п: "p",
  Р: "R",
  р: "r",
  С: "S",
  с: "s",
  Т: "T",
  т: "t",
  Ћ: "Ć",
  ћ: "ć",
  У: "U",
  у: "u",
  Ф: "F",
  ф: "f",
  Х: "H",
  х: "h",
  Ц: "C",
  ц: "c",
  Ч: "Č",
  ч: "č",
  Џ: "Dž",
  џ: "dž",
  Ш: "Š",
  ш: "š",
}

// U+02C7 caron, U+00B4 acute accent, U+02CA modifier acute, U+02CB modifier grave —
// glyph-order-corruption marks found in extracted LaTeX PDF text (§6b of search-plan).
const REPAIR_MARKS = new Set<string>(["\u02c7", "\u00b4", "\u02ca", "\u02cb"])

const REPAIR_PAIRS: Record<string, string> = {
  "\u02c7s": "š",
  "s\u02c7": "š",
  "\u02c7c": "č",
  "c\u02c7": "č",
  "\u02c7z": "ž",
  "z\u02c7": "ž",
  "\u00b4c": "ć",
  "c\u00b4": "ć",
  "\u02c7S": "Š",
  "S\u02c7": "Š",
  "\u02c7C": "Č",
  "C\u02c7": "Č",
  "\u02c7Z": "Ž",
  "Z\u02c7": "Ž",
  "\u00b4C": "Ć",
  "C\u00b4": "Ć",
}

export function repairDiacritics(text: string): string {
  let out = ""
  let i = 0
  while (i < text.length) {
    const pair = text.slice(i, i + 2)
    const fixed = REPAIR_PAIRS[pair]
    if (fixed !== undefined) {
      out += fixed
      i += 2
    } else {
      const ch = text[i]
      if (!REPAIR_MARKS.has(ch)) out += ch
      i += 1
    }
  }
  return out
}

export function normalizeSr(text: string): string {
  const repaired = repairDiacritics(text)
  let out = ""
  for (const ch of repaired) {
    const latin = CYRILLIC_TO_LATIN[ch] ?? ch
    for (const surface of latin) {
      out += fold(surface)
    }
  }
  return out
}

export interface NormalizedMap {
  norm: string
  toOrig: (offset: number) => number
  origStarts: number[]
  origEnds: number[]
}

export function normalizeWithMap(text: string): NormalizedMap {
  const norm: string[] = []
  const starts: number[] = []
  const ends: number[] = []

  let i = 0
  while (i < text.length) {
    const pair = text.slice(i, i + 2)
    let unit: string
    let consumed = 1
    if (Object.prototype.hasOwnProperty.call(REPAIR_PAIRS, pair)) {
      unit = REPAIR_PAIRS[pair]
      consumed = 2
    } else {
      const ch = text[i]
      if (REPAIR_MARKS.has(ch)) {
        i += 1
        continue
      }
      unit = ch
    }

    const latin = CYRILLIC_TO_LATIN[unit] ?? unit
    for (const surface of latin) {
      norm.push(fold(surface))
      starts.push(i)
      ends.push(i + consumed)
    }
    i += consumed
  }

  return {
    norm: norm.join(""),
    toOrig: (offset) => {
      if (offset <= 0) return 0
      if (offset >= starts.length) return text.length
      return starts[offset]
    },
    origStarts: starts,
    origEnds: ends,
  }
}

export function findAll(origText: string, query: string): Array<{ start: number; end: number }> {
  const q = normalizeSr(query)
  if (!q) return []

  const { norm, origStarts, origEnds } = normalizeWithMap(origText)
  const result: Array<{ start: number; end: number }> = []
  let from = 0
  while (true) {
    const idx = norm.indexOf(q, from)
    if (idx === -1) break
    result.push({
      start: origStarts[idx],
      end: origEnds[idx + q.length - 1],
    })
    from = idx + 1
  }
  return result
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export function makeSnippet(origText: string, query: string, width = 80): string {
  const matches = findAll(origText, query)
  if (matches.length === 0) return escapeHtml(origText.slice(0, width))

  const first = matches[0]
  const firstLen = first.end - first.start
  let start = 0
  let end = origText.length
  if (origText.length > width) {
    const ideal = first.start - Math.max(0, Math.floor((width - firstLen) / 2))
    start = Math.max(0, Math.min(ideal, origText.length - width))
    end = start + width
  }
  if (firstLen > width) {
    start = first.start
    end = first.end
  }

  let out = ""
  let cursor = start
  for (const m of matches) {
    if (m.end <= start || m.start >= end) continue
    if (m.start > cursor) out += escapeHtml(origText.slice(cursor, m.start))
    out += `<mark>${escapeHtml(origText.slice(m.start, m.end))}</mark>`
    cursor = Math.max(cursor, m.end)
  }
  out += escapeHtml(origText.slice(cursor, end))
  return out
}

export function srGetFn(obj: unknown, path: string | string[]): string {
  const keys = Array.isArray(path) ? path : [path]
  let value: unknown = obj
  for (const key of keys) {
    value = (value as Record<string, unknown>)?.[key]
  }
  return normalizeSr(String(value ?? ""))
}

function fold(surface: string): string {
  return surface
    .normalize("NFD")
    .replace(DIACRITICS_RE, "")
    .replace(/Đ/g, "D")
    .replace(/đ/g, "d")
    .toLowerCase()
}
