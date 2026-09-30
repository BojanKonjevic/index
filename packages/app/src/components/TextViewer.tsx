import { useEffect, useState } from "react"
import { Check, Copy, Loader2 } from "lucide-react"
import hljs from "highlight.js/lib/core"
import sql from "highlight.js/lib/languages/sql"
import python from "highlight.js/lib/languages/python"
import { useI18n } from "@/hooks/useI18n"
import { cn } from "@/lib/utils"
import { escapeHtml, languageForUrl, splitSqlBlocks } from "@/lib/codeText"

hljs.registerLanguage("sql", sql)
hljs.registerLanguage("python", python)

function highlightBlock(code: string, language: "sql" | "python" | "text"): string {
  if (language !== "text" && code.trim().length > 0) {
    return hljs.highlight(code, { language }).value
  }
  return escapeHtml(code)
}

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

  const blocks =
    language === "sql"
      ? splitSqlBlocks(state.source)
      : [{ id: "block-0", header: null as string | null, code: state.source }]
  const languageClass = language === "text" ? undefined : `language-${language}`

  return (
    <div className="codeblock flex-1 overflow-y-auto px-3 py-3 sm:px-6 sm:py-4">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 pb-8">
        {blocks.map((block) => (
          <section
            key={block.id}
            className="overflow-hidden rounded-[0.625rem] border border-[var(--border-default)] bg-[var(--bg-surface)]"
          >
            <div className="flex items-center gap-2 border-b border-[var(--border-faint)] bg-[var(--bg-subtle)] px-3 py-1.5">
              <span className="min-w-0 flex-1 truncate font-mono text-[0.688rem] font-medium text-[var(--text-secondary)]">
                {block.header ?? t("viewer.code_file")}
              </span>
              <CopyButton
                text={block.header ? `${block.header}\n${block.code}` : block.code}
                label={t("viewer.code_copy")}
              />
            </div>
            <pre className="overflow-x-auto p-3 text-[0.75rem] leading-relaxed">
              <code
                className={cn("font-mono whitespace-pre", languageClass)}
                dangerouslySetInnerHTML={{ __html: highlightBlock(block.code, language) }}
              />
            </pre>
          </section>
        ))}
      </div>
    </div>
  )
}
