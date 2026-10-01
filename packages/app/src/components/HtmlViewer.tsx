import { useEffect, useMemo } from "react"
import { ExternalLink, Loader2 } from "lucide-react"
import { useI18n } from "@/hooks/useI18n"
import { useFetchBytes } from "@/lib/useFetchBytes"

export default function HtmlViewer({ url, title }: { url: string; title: string }) {
  const { t } = useI18n()
  const { data, error } = useFetchBytes(url)
  const src = useMemo(
    () => (data ? URL.createObjectURL(new Blob([data as BlobPart], { type: "text/html" })) : null),
    [data],
  )
  useEffect(
    () => () => {
      if (src) URL.revokeObjectURL(src)
    },
    [src],
  )

  if (error) {
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

  if (data === null) {
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
        src={src ?? undefined}
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
