import { Download, Search, X, ArrowUp, ArrowDown, ChevronsUpDown } from "lucide-react"
import { useMemo, useState } from "react"
import { useI18n } from "@/hooks/useI18n"
import { parseCsv } from "@/lib/codeText"

function compareCells(a: string, b: string): number {
  // Strict numbers only: parseFloat("2015-11-15") is 2015, Number() is NaN.
  // Numbers sort before text so mixed columns stay transitive.
  const aNum = a !== "" ? Number(a) : NaN
  const bNum = b !== "" ? Number(b) : NaN
  const aIsNum = !Number.isNaN(aNum)
  const bIsNum = !Number.isNaN(bNum)
  if (aIsNum && bIsNum) return aNum - bNum
  if (aIsNum !== bIsNum) return aIsNum ? -1 : 1
  return a.localeCompare(b, "sr", { numeric: true })
}

const CSV_ROW_INCREMENT = 500

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
  const [sortCol, setSortCol] = useState<number | null>(null)
  const [sortDir, setSortDir] = useState<1 | -1>(1)
  const [query, setQuery] = useState("")
  const [rowLimit, setRowLimit] = useState(CSV_ROW_INCREMENT)
  const rows = useMemo(
    () => parseCsv(source, url.toLowerCase().endsWith(".tsv") ? "\t" : ","),
    [source, url],
  )
  if (rows.length === 0) return null
  const [header, ...body] = rows

  const q = query.trim().toLowerCase()
  const filtered = q ? body.filter((cells) => cells.some((c) => c.toLowerCase().includes(q))) : body
  const sorted =
    sortCol === null
      ? filtered
      : [...filtered].sort((a, b) => compareCells(a[sortCol] ?? "", b[sortCol] ?? "") * sortDir)
  const visible = sorted.slice(0, rowLimit)

  const toggleSort = (col: number) => {
    if (sortCol === col) {
      if (sortDir === 1) {
        setSortDir(-1)
      } else {
        setSortCol(null)
        setSortDir(1)
      }
    } else {
      setSortCol(col)
      setSortDir(1)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-[var(--border-faint)] px-3 py-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-[var(--text-hint)]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("viewer.csv_filter")}
            className="h-8 w-full rounded-[0.438rem] bg-[var(--bg-subtle)] pl-8 pr-8 text-[0.75rem] text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-hint)] focus:border-[var(--accent)] border border-transparent focus:bg-[var(--bg-surface)]"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label={t("subjects.clear")}
              className="absolute right-1.5 top-1/2 flex size-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-[var(--text-hint)] transition-colors hover:text-[var(--text-primary)]"
            >
              <X className="size-3" />
            </button>
          )}
        </div>
        <span className="shrink-0 font-mono text-[0.688rem] text-[var(--text-hint)]">
          {q ? `${visible.length} / ${body.length}` : `${body.length}`}
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-max min-w-full border-separate border-spacing-0 text-[0.75rem]">
          <thead className="sticky top-0 z-[5]">
            <tr>
              {header.map((cell, i) => (
                <th
                  key={i}
                  aria-sort={sortCol === i ? (sortDir === 1 ? "ascending" : "descending") : "none"}
                  className="border-b border-[var(--border-strong)] bg-[var(--bg-subtle)] px-1 py-1 text-left font-semibold whitespace-nowrap text-[var(--text-primary)]"
                >
                  <button
                    onClick={() => toggleSort(i)}
                    aria-label={`${cell}, ${t("viewer.csv_sort")}`}
                    className="flex cursor-pointer items-center gap-1 px-1 py-0.5 transition-colors hover:text-[var(--accent-strong)]"
                  >
                    {cell}
                    {sortCol === i ? (
                      sortDir === 1 ? (
                        <ArrowUp className="size-3" />
                      ) : (
                        <ArrowDown className="size-3" />
                      )
                    ) : (
                      <ChevronsUpDown className="size-3 opacity-40" />
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((cells, r) => (
              <tr key={r}>
                {cells.map((cell, c) => (
                  <td
                    key={c}
                    className="border-b border-[var(--border-faint)] px-2 py-1 font-mono whitespace-nowrap text-[var(--text-secondary)]"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 ? (
          <p className="px-3 py-6 text-center text-[0.75rem] text-[var(--text-hint)]">
            {t("viewer.csv_no_match")}
          </p>
        ) : (
          sorted.length > rowLimit && (
            <button
              onClick={() => setRowLimit((n) => n + CSV_ROW_INCREMENT)}
              className="w-full cursor-pointer border-t border-[var(--border-faint)] px-3 py-2 text-center font-mono text-[0.688rem] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            >
              {t("viewer.csv_more_fmt", {
                shown: visible.length,
                total: sorted.length,
              })}
            </button>
          )
        )}
      </div>
      <div className="flex shrink-0 items-center justify-between gap-2 border-t border-[var(--border-faint)] bg-[var(--bg-subtle)] px-3 py-1.5 text-[0.688rem] text-[var(--text-hint)]">
        <span>
          {body.length} {t("viewer.csv_rows")} · {header.length} {t("viewer.csv_cols")}
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
