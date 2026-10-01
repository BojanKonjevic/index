import { Check, Copy, Download } from "lucide-react"
import { useState } from "react"
import { useI18n } from "@/hooks/useI18n"
import { parseCsv } from "@/lib/codeText"

export function CopyButton({ text, label }: { text: string; label: string }) {
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

export function Section({
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

const CSV_PREVIEW_ROWS = 20

export default function CsvTable({
  source,
  url,
  name,
}: {
  source: string
  url: string
  name: string
}) {
  const { t } = useI18n()
  const rows = parseCsv(source, url.toLowerCase().endsWith(".tsv") ? "\t" : ",")
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
