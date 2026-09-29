export interface CodeBlock {
  id: string
  header: string | null
  code: string
}

/** SQL renders highlighted, everything else renders as plain text. */
export function languageForUrl(url: string): "sql" | "text" {
  const dot = url.lastIndexOf(".")
  const ext = dot >= 0 ? url.slice(dot + 1).toLowerCase() : ""
  return ext === "sql" ? "sql" : "text"
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
