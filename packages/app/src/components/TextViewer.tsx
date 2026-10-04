import { Loader2 } from "lucide-react"
import hljs from "highlight.js/lib/core"
import sql from "highlight.js/lib/languages/sql"
import python from "highlight.js/lib/languages/python"
import { marked } from "marked"
import { useI18n } from "@/hooks/useI18n"
import { escapeHtml, languageForUrl, splitSqlBlocks } from "@/lib/codeText"
import { useFetchBytes } from "@/lib/useFetchBytes"
import CsvTable from "@/components/CsvTable"
import { Section } from "@/components/Section"
import { SqlFileView } from "@/components/SqlRunner"

hljs.registerLanguage("sql", sql)
hljs.registerLanguage("python", python)

function highlightLine(line: string, language: "sql" | "python"): string {
  if (line.trim() === "") return " "
  return hljs.highlight(line, { language }).value
}

/** One highlighted line with an explicit number, so students can say
 *  "linija 42" and mean the same thing. Highlighting runs per line:
 *  multi-line strings lose spanning color, but a broken span can never
 *  eat the rest of the file. */
function CodeLines({ lines, language }: { lines: string[]; language: "sql" | "python" | "text" }) {
  const highlight = language === "text" ? null : language
  return (
    <pre className="overflow-x-auto p-3 text-[0.75rem] leading-relaxed">
      <code className="font-mono">
        {lines.map((line, i) => (
          <span key={i} className="codeline">
            <span className="lineno">{i + 1}</span>
            <span
              dangerouslySetInnerHTML={{
                __html: highlight ? highlightLine(line, highlight) : escapeHtml(line) || " ",
              }}
            />
          </span>
        ))}
      </code>
    </pre>
  )
}

function decodeText(data: Uint8Array): string {
  return new TextDecoder("utf-8", { fatal: false }).decode(data)
}

export default function TextViewer({ url, dataUrls }: { url: string; dataUrls?: string[] }) {
  const { t } = useI18n()
  const { data, error } = useFetchBytes(url)
  const language = languageForUrl(url)
  const fileName = url.split("/").pop() ?? t("viewer.code_file")
  const source = data === null ? null : decodeText(data)

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center pt-20 text-sm text-[var(--text-secondary)]">
        {t("viewer.code_error")}
      </div>
    )
  }

  if (source === null) {
    return (
      <div className="flex flex-1 items-center justify-center pt-20 text-sm text-[var(--text-secondary)]">
        <Loader2 className="size-5 animate-spin" />
      </div>
    )
  }

  return (
    <div
      className={`codeblock flex min-h-0 flex-1 flex-col ${
        language === "csv" ? "overflow-hidden" : "overflow-y-auto"
      }`}
    >
      <div className="mx-auto flex min-h-0 w-full flex-1 flex-col gap-3 px-3 pt-3 pb-3 sm:px-6 sm:pt-4 sm:pb-4">
        {language === "md" ? (
          <Section title={fileName} copyText={source}>
            <article
              className="markdown px-4 py-3"
              // Corpus-trusted HTML: these files ship from our own R2,
              // never from user input.
              dangerouslySetInnerHTML={{ __html: marked.parse(source) as string }}
            />
          </Section>
        ) : language === "csv" ? (
          <Section title={fileName} className="flex min-h-0 flex-1 flex-col">
            <CsvTable source={source} url={url} name={fileName} />
          </Section>
        ) : language === "sql" ? (
          <SqlFileView blocks={splitSqlBlocks(source)} fileName={fileName} dataUrls={dataUrls} />
        ) : (
          <Section title={fileName} copyText={source}>
            <CodeLines lines={source.split("\n")} language={language} />
          </Section>
        )}
      </div>
    </div>
  )
}
