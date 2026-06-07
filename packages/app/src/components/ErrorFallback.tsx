import { AlertTriangle, RefreshCw } from "lucide-react"
import { useI18n } from "@/hooks/useI18n"

export function ErrorFallback({ error }: { error?: Error }) {
  const { t } = useI18n()
  return (
    <div className="flex h-screen items-center justify-center bg-[var(--bg-page)] p-8">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <AlertTriangle className="size-10 text-[var(--status-soon-text)]" />
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">{t("error.title")}</h2>
        <p className="text-sm text-[var(--text-secondary)]">
          {error?.message || t("error.description")}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-[0.5rem] bg-[var(--text-primary)] px-4 py-2 text-sm font-medium text-[var(--bg-surface)] transition-all duration-100 hover:opacity-85 active:scale-[0.98]"
        >
          <RefreshCw className="size-4" />
          {t("error.retry")}
        </button>
      </div>
    </div>
  )
}
