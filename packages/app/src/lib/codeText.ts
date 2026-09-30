export interface CodeBlock {
  id: string
  header: string | null
  code: string
}

/** SQL and Python render highlighted, Markdown renders formatted, CSV
 *  renders as a table, everything else renders as plain text. */
export function languageForUrl(url: string): "sql" | "python" | "md" | "csv" | "text" {
  const dot = url.lastIndexOf(".")
  const ext = dot >= 0 ? url.slice(dot + 1).toLowerCase() : ""
  if (ext === "sql") return "sql"
  if (ext === "py") return "python"
  if (ext === "md" || ext === "markdown") return "md"
  if (ext === "csv" || ext === "tsv") return "csv"
  return "text"
}

/**
 * SQL solution files carry `//1`, `//2` task comments. Splitting on them
 * turns one long script into per-task blocks with their own copy button,
 * mirroring how the PDF viewer jumps per page.
 */
export function splitSqlBlocks(source: string): CodeBlock[] {
  const lines = source.split("\n")
  const blocks: CodeBlock[] = []
  let current: string[] = []
  let header: string | null = null
  const flush = () => {
    const code = current.join("\n").replace(/^\n+/, "").replace(/\s+$/, "")
    if (code.length > 0 || header !== null) {
      blocks.push({ id: `block-${blocks.length}`, header, code })
    }
    current = []
    header = null
  }
  for (const line of lines) {
    if (/^\/\/\d+\b/.test(line.trim())) {
      flush()
      header = line.trim()
    } else {
      current.push(line)
    }
  }
  flush()
  return blocks.length > 0 ? blocks : [{ id: "block-0", header: null, code: source }]
}

export function escapeHtml(raw: string): string {
  return raw.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

/** Minimal quote-aware CSV split: handles quoted fields with commas and
 *  doubled quotes, enough for course datasets. Not a full RFC parser. */
export function parseCsv(text: string, delimiter = ","): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let quoted = false
  const push = () => {
    row.push(field)
    field = ""
  }
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          quoted = false
        }
      } else {
        field += c
      }
    } else if (c === '"') {
      quoted = true
    } else if (c === delimiter) {
      push()
    } else if (c === "\n") {
      push()
      if (row.length > 1 || row[0] !== "") rows.push(row)
      row = []
    } else if (c !== "\r") {
      field += c
    }
  }
  push()
  if (row.length > 1 || row[0] !== "") rows.push(row)
  return rows
}
