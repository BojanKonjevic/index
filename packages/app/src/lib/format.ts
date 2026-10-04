export type FormatKey = "pdf" | "video" | "image" | "html" | "md" | "txt" | "py" | "sql" | "csv"

const EXTENSION_FORMATS: Record<string, FormatKey> = {
  pdf: "pdf",
  mp4: "video",
  webm: "video",
  png: "image",
  jpg: "image",
  jpeg: "image",
  gif: "image",
  html: "html",
  htm: "html",
  md: "md",
  markdown: "md",
  txt: "txt",
  py: "py",
  sql: "sql",
  csv: "csv",
  tsv: "csv",
}

const FILETYPE_FALLBACK: Record<string, FormatKey> = {
  pdf: "pdf",
  video: "video",
  image: "image",
  html: "html",
  text: "txt",
}

export function extensionOf(url: string): string | null {
  const path = url.split("?")[0]
  const dot = path.lastIndexOf(".")
  return dot >= 0 ? path.slice(dot + 1).toLowerCase() : null
}

export function formatOf(fileType: string, url?: string | null): FormatKey {
  if (url) {
    const hit = EXTENSION_FORMATS[extensionOf(url) ?? ""]
    if (hit) return hit
  }
  return FILETYPE_FALLBACK[fileType] ?? "txt"
}
