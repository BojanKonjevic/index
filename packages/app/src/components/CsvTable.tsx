import { Download } from "lucide-react"
import { useI18n } from "@/hooks/useI18n"
import { parseCsv } from "@/lib/codeText"

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
