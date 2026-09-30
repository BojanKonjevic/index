import { useEffect, useState } from "react"
import { Check, Copy, Download, ExternalLink, Loader2 } from "lucide-react"
import hljs from "highlight.js/lib/core"
import sql from "highlight.js/lib/languages/sql"
import python from "highlight.js/lib/languages/python"
import { marked } from "marked"
import { useI18n } from "@/hooks/useI18n"
import { escapeHtml, languageForUrl, parseCsv, splitSqlBlocks } from "@/lib/codeText"

hljs.registerLanguage("sql", sql)
hljs.registerLanguage("python", python)

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(text).catch(() => {})
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
      aria-label={label}
      title={label}
      className="flex shrink-0 cursor-pointer items-center justify-center size-7 rounded-[0.375rem] text-[var(--text-hint)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </button>
  )
}

function Section({
  title,
  copyText,
  children,
}: {
  title: string
  copyText?: string
  children: React.ReactNode
}) {
  const { t } = useI18n()
  return (
    <section className="overflow-hidden rounded-[0.625rem] border border-[var(--border-default)] bg-[var(--bg-surface)]">
      <div className="flex items-center gap-2 border-b border-[var(--border-faint)] bg-[var(--bg-subtle)] px-3 py-1.5">
        <span className="min-w-0 flex-1 truncate font-mono text-[0.688rem] font-medium text-[var(--text-secondary)]">
          {title}
        </span>
        {copyText !== undefined && <CopyButton text={copyText} label={t("viewer.code_copy")} />}
      </div>
      {children}
    </section>
  )
}

/** One highlighted line with an explicit number, so students can say
 *  "linija 42" and mean the same thing. Highlighting runs per line:
 *  multi-line strings lose spanning color, but a broken span can never
 *  eat the rest of the file. */
function CodeLines({ lines, language }: { lines: string[]; language: "sql" | "python" | "text" }) {
  return (
    <pre className="overflow-x-auto p-3 text-[0.75rem] leading-relaxed">
      <code className="font-mono">
        {lines.map((line, i) => (
          <span key={i} className="codeline">
            <span className="lineno">{i + 1}</span>
            <span
              dangerouslySetInnerHTML={{
                __html:
                  language === "text" || line.trim() === ""
                    ? escapeHtml(line) || " "
                    : hljs.highlight(line, { language }).value,
              }}
            />
          </span>
        ))}
      </code>
    </pre>
  )
}

const CSV_PREVIEW_ROWS = 20

function CsvTable({ source, url, name }: { source: string; url: string; name: string }) {
  const { t } = useI18n()
  const rows = parseCsv(source)
  if (rows.length === 0) return null
  const [header, ...body] = rows
  const preview = body.slice(0, CSV_PREVIEW_ROWS)
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[0.75rem]">
          <thead>
            <tr>
              {header.map((cell, i) => (
                <th
                  key={i}
                  className="sticky top-0 border-b border-[var(--border-strong)] bg-[var(--bg-subtle)] px-2 py-1.5 text-left font-semibold whitespace-nowrap text-[var(--text-primary)]"
                >
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.map((cells, r) => (
              <tr key={r} className="border-b border-[var(--border-faint)]">
                {cells.map((cell, c) => (
                  <td
                    key={c}
                    className="max-w-[12rem] truncate px-2 py-1 font-mono whitespace-nowrap text-[var(--text-secondary)]"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-[var(--border-faint)] bg-[var(--bg-subtle)] px-3 py-1.5 text-[0.688rem] text-[var(--text-hint)]">
        <span>
          {rows.length} {t("viewer.csv_rows")} · {header.length} {t("viewer.csv_cols")}
        </span>
        <a
          href={url}
          download={name}
          className="flex items-center gap-1 font-medium text-[var(--accent-strong)] hover:underline"
        >
          <Download className="size-3.5" />
          {t("viewer.csv_download")}
        </a>
      </div>
    </div>
  )
}

export default function TextViewer({ url }: { url: string }) {
  const { t } = useI18n()
  const [state, setState] = useState<{ url: string; source: string | null; error: boolean }>({
    url,
    source: null,
    error: false,
  })
  // Fresh url means fresh content: adjust during render, fetch in the effect.
  if (state.url !== url) {
    setState({ url, source: null, error: false })
  }
  const language = languageForUrl(url)
  const fileName = url.split("/").pop() ?? t("viewer.code_file")

  useEffect(() => {
    let active = true
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.text()
      })
      .then((text) => {
        if (active) setState({ url, source: text, error: false })
      })
      .catch(() => {
        if (active) setState({ url, source: null, error: true })
      })
    return () => {
      active = false
    }
  }, [url])

  if (state.error) {
    return (
      <div className="flex flex-1 items-center justify-center pt-20 text-sm text-[var(--text-secondary)]">
        {t("viewer.code_error")}
      </div>
    )
  }

  if (state.source === null) {
    return (
      <div className="flex flex-1 items-center justify-center pt-20 text-sm text-[var(--text-secondary)]">
        <Loader2 className="size-5 animate-spin" />
      </div>
    )
  }

  return (
    <div className="codeblock flex-1 overflow-y-auto px-3 py-3 sm:px-6 sm:py-4">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 pb-8">
        {language === "md" ? (
          <Section title={fileName} copyText={state.source}>
            <article
              className="markdown px-4 py-3"
              // Corpus-trusted HTML: these files ship from our own R2,
              // never from user input.
              dangerouslySetInnerHTML={{ __html: marked.parse(state.source) as string }}
            />
          </Section>
        ) : language === "csv" ? (
          <Section title={fileName}>
            <CsvTable source={state.source} url={url} name={fileName} />
          </Section>
        ) : language === "sql" ? (
          splitSqlBlocks(state.source).map((block) => {
            const lines = block.code.split("\n")
            return (
              <Section
                key={block.id}
                title={block.header ?? fileName}
                copyText={block.header ? `${block.header}\n${block.code}` : block.code}
              >
                <CodeLines lines={lines} language={language} />
              </Section>
            )
          })
        ) : (
          <Section title={fileName} copyText={state.source}>
            <CodeLines lines={state.source.split("\n")} language={language} />
          </Section>
        )}
      </div>
    </div>
  )
}

export function HtmlViewer({ url, title }: { url: string; title: string }) {
  const { t } = useI18n()
  const [state, setState] = useState<{ url: string; src: string | null; error: boolean }>({
    url,
    src: null,
    error: false,
  })
  // Fresh url means fresh content: adjust during render, fetch in the effect.
  if (state.url !== url) {
    setState({ url, src: null, error: false })
  }

  useEffect(() => {
    let active = true
    let objectUrl: string | null = null
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.blob()
      })
      .then((blob) => {
        if (!active) return
        objectUrl = URL.createObjectURL(new Blob([blob], { type: "text/html" }))
        setState({ url, src: objectUrl, error: false })
      })
      .catch(() => {
        if (active) setState({ url, src: null, error: true })
      })
    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [url])

  if (state.error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 pt-20 text-sm text-[var(--text-secondary)]">
        <span>{t("viewer.code_error")}</span>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 font-medium text-[var(--accent-strong)] hover:underline"
        >
          <ExternalLink className="size-4" />
          {t("viewer.html_open")}
        </a>
      </div>
    )
  }

  if (state.src === null) {
    return (
      <div className="flex flex-1 items-center justify-center pt-20 text-sm text-[var(--text-secondary)]">
        <Loader2 className="size-5 animate-spin" />
      </div>
    )
  }

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      {/* Blob URL: no platform CSP applies, so images, styles, and MathJax
        load. Sandbox keeps page JS away from app storage. */}
      <iframe
        title={title}
        src={state.src}
        sandbox="allow-scripts"
        className="min-h-0 flex-1 border-0 bg-white"
      />
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t("viewer.html_open")}
        title={t("viewer.html_open")}
        className="absolute right-3 bottom-3 flex size-9 items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-secondary)] shadow-sm transition-colors hover:text-[var(--text-primary)]"
      >
        <ExternalLink className="size-4" />
      </a>
    </div>
  )
}
