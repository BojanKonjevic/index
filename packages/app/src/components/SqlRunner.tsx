import { useRef, useState } from "react"
import { Play, FastForward, RotateCcw, Loader2, Download, X } from "lucide-react"
import { type Database, type QueryExecResult } from "sql.js"
import { useI18n } from "@/hooks/useI18n"
import { useSqlSession } from "@/lib/sqlSession"
import { Section } from "@/components/Section"
import { escapeHtml } from "@/lib/codeText"
import hljs from "highlight.js/lib/core"
import sql from "highlight.js/lib/languages/sql"

hljs.registerLanguage("sql", sql)

const RESULT_ROW_LIMIT = 200

function toCsv(set: QueryExecResult): string {
  const quote = (v: unknown) => {
    if (v === null || v === undefined) return ""
    const s = String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [set.columns.map(quote).join(",")]
  for (const row of set.values) lines.push(row.map(quote).join(","))
  return lines.join("\n")
}

function downloadCsv(set: QueryExecResult, name: string) {
  const blob = new Blob([toCsv(set)], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

interface PanelOutput {
  title: string
  sets: QueryExecResult[]
  error: string | null
}

export function SqlFileView({
  blocks,
  fileName,
  dataUrls = [],
}: {
  blocks: { id: string; header: string | null; code: string }[]
  fileName: string
  dataUrls?: string[]
}) {
  const { t } = useI18n()
  const { getDb, resetDb } = useSqlSession(dataUrls)
  const [output, setOutput] = useState<PanelOutput | null>(null)

  const handleReset = () => {
    resetDb()
    setOutput(null)
  }

  return (
    <>
      {blocks.map((block) => (
        <SqlRunner
          key={block.id}
          title={block.header ?? fileName}
          code={block.code}
          copyText={block.header ? `${block.header}\n${block.code}` : block.code}
          getDb={getDb}
          onReset={handleReset}
          onOutput={setOutput}
        />
      ))}

      <div className="sticky bottom-0 z-10 overflow-hidden rounded-[0.625rem] border border-[var(--border-default)] bg-[var(--bg-surface)]">
        <div className="flex items-center gap-2 border-b border-[var(--border-faint)] bg-[var(--bg-subtle)] px-3 py-1.5">
          <span className="min-w-0 flex-1 truncate font-mono text-[0.688rem] font-medium text-[var(--text-secondary)]">
            {output ? output.title : t("viewer.sql_empty_hint")}
          </span>
          {output && (
            <button
              onClick={() => setOutput(null)}
              aria-label={t("viewer.find_clear")}
              className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded text-[var(--text-hint)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        {output &&
          (output.error ? (
            <p className="max-h-[32vh] overflow-auto px-3 py-2.5 font-mono text-[0.75rem] leading-relaxed text-[var(--status-soon-text)]">
              {output.error}
            </p>
          ) : output.sets.length === 0 ? (
            <p className="px-3 py-2.5 font-mono text-[0.75rem] text-[var(--text-secondary)]">OK</p>
          ) : (
            <div className="flex max-h-[32vh] flex-col gap-3 overflow-auto px-3 py-2.5">
              {output.sets.map((set, i) => (
                <div key={i}>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="font-mono text-[0.688rem] text-[var(--text-hint)]">
                      {set.values.length === 1
                        ? t("viewer.sql_rows_one")
                        : t("viewer.sql_rows_fmt", { n: set.values.length })}
                    </span>
                    <button
                      onClick={() => downloadCsv(set, `${output.title}.csv`)}
                      aria-label={t("viewer.csv_download")}
                      title={t("viewer.csv_download")}
                      className="flex size-6 cursor-pointer items-center justify-center rounded text-[var(--text-hint)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
                    >
                      <Download className="size-3.5" />
                    </button>
                  </div>
                  <div className="overflow-x-auto rounded-[0.375rem] border border-[var(--border-faint)]">
                    <table className="w-max min-w-full border-collapse text-[0.75rem]">
                      <thead>
                        <tr>
                          {set.columns.map((col, c) => (
                            <th
                              key={c}
                              className="border-b border-[var(--border-default)] bg-[var(--bg-subtle)] px-2 py-1.5 text-left font-semibold whitespace-nowrap text-[var(--text-primary)]"
                            >
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {set.values.slice(0, RESULT_ROW_LIMIT).map((row, r) => (
                          <tr key={r} className="border-b border-[var(--border-faint)]">
                            {row.map((cell, c) => (
                              <td
                                key={c}
                                className="px-2 py-1 font-mono whitespace-nowrap text-[var(--text-secondary)]"
                              >
                                {cell === null ? (
                                  <span className="italic text-[var(--text-hint)]">NULL</span>
                                ) : (
                                  String(cell)
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {set.values.length > RESULT_ROW_LIMIT && (
                    <p className="mt-1 font-mono text-[0.688rem] text-[var(--text-hint)]">
                      {t("viewer.sql_more_fmt", { n: set.values.length - RESULT_ROW_LIMIT })}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ))}
      </div>
    </>
  )
}

function SqlRunner({
  title,
  code,
  copyText,
  getDb,
  onReset,
  onOutput,
}: {
  title: string
  code: string
  copyText: string
  getDb: () => Promise<Database>
  onReset: () => void
  onOutput: (output: PanelOutput) => void
}) {
  const { t } = useI18n()
  const [selection, setSelection] = useState("")
  const [running, setRunning] = useState(false)
  const codeRef = useRef<HTMLDivElement>(null)

  const updateSelection = () => {
    const sel = window.getSelection()
    const text = sel && codeRef.current?.contains(sel.anchorNode) ? sel.toString().trim() : ""
    setSelection((prev) => (prev === text ? prev : text))
  }

  const run = async (sqlText: string) => {
    setRunning(true)
    try {
      // Task markers (//1, //2) are display headers, not SQL.
      const executable = sqlText
        .split("\n")
        .filter((line) => !/^\/\/\d+\b/.test(line.trim()))
        .join("\n")
      const db = await getDb()
      const sets = db.exec(executable)
      onOutput({ title, sets, error: null })
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      const dataError = /^DATA_LOAD_FAILED:(\d+)$/.exec(message)
      onOutput({
        title,
        sets: [],
        error: dataError ? t("viewer.sql_data_error_fmt", { n: dataError[1] }) : message,
      })
    } finally {
      setRunning(false)
    }
  }

  const lines = code.split("\n")

  return (
    <Section
      title={title}
      copyText={copyText}
      actions={
        <>
          <button
            onClick={() => void run(selection)}
            disabled={!selection || running}
            aria-label={t("viewer.sql_run_selected")}
            title={t("viewer.sql_run_selected")}
            className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-[0.375rem] text-[var(--text-hint)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] disabled:pointer-events-none disabled:opacity-30"
          >
            {running ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Play className="size-3.5" />
            )}
          </button>
          <button
            onClick={() => void run(code)}
            disabled={running}
            aria-label={t("viewer.sql_run_all")}
            title={t("viewer.sql_run_all")}
            className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-[0.375rem] text-[var(--text-hint)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] disabled:pointer-events-none disabled:opacity-30"
          >
            <FastForward className="size-3.5" />
          </button>
          <button
            onClick={onReset}
            disabled={running}
            aria-label={t("viewer.sql_reset")}
            title={t("viewer.sql_reset")}
            className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-[0.375rem] text-[var(--text-hint)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] disabled:pointer-events-none disabled:opacity-30"
          >
            <RotateCcw className="size-3.5" />
          </button>
        </>
      }
    >
      <div ref={codeRef} onMouseUp={updateSelection} onKeyUp={updateSelection}>
        <pre className="overflow-x-auto p-3 text-[0.75rem] leading-relaxed">
          <code className="font-mono">
            {lines.map((line, i) => (
              <span key={i} className="codeline">
                <span className="lineno">{i + 1}</span>
                <span
                  dangerouslySetInnerHTML={{
                    __html:
                      hljs.highlight(line, { language: "sql" }).value || escapeHtml(line) || " ",
                  }}
                />
              </span>
            ))}
          </code>
        </pre>
      </div>
    </Section>
  )
}
