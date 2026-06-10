import { AlertTriangle, RefreshCw, WifiOff } from "lucide-react"
import { useI18n } from "@/hooks/useI18n"
import { ApiError } from "@/lib/api-error"

export function ErrorFallback({ error }: { error?: Error }) {
  const { t } = useI18n()

  const isNetworkError = error instanceof TypeError && error.message === "Failed to fetch"
  const isApiError = error instanceof ApiError
  const message = isApiError ? error.message : undefined

  const Icon = isNetworkError ? WifiOff : AlertTriangle

  return (
    <div className="flex h-screen items-center justify-center bg-[var(--bg-page)] p-8">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <Icon className="size-10 text-[var(--status-soon-text)]" />
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">{t("error.title")}</h2>
        <p className="text-sm text-[var(--text-secondary)]">{message || t("error.description")}</p>
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
