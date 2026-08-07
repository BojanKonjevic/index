import { WifiOff } from "lucide-react"
import { useI18n } from "@/hooks/useI18n"

// In-flow top line item: it pushes the app shell below it instead of floating
// over it. Height is explicit so the fixed sidebar can match it.
export const OFFLINE_BANNER_HEIGHT_CLASS = "h-[calc(2.25rem+env(safe-area-inset-top))]"
export const OFFLINE_BANNER_OFFSET_CLASS = "top-[2.25rem] h-[calc(100vh-2.25rem)]"

export function OfflineBanner() {
  const { t } = useI18n()
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center justify-center gap-2 border-b-2 border-[var(--border-strong)] bg-[var(--bg-surface)] px-4 pt-[env(safe-area-inset-top)] text-[0.75rem] font-medium text-[var(--status-info-text)] ${OFFLINE_BANNER_HEIGHT_CLASS}`}
    >
      <WifiOff className="size-3.5 shrink-0" />
      <span className="truncate">{t("offline.banner")}</span>
    </div>
  )
}
