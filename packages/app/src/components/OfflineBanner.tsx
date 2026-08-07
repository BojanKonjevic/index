import { WifiOff } from "lucide-react"
import { useI18n } from "@/hooks/useI18n"

export function OfflineBanner() {
  const { t } = useI18n()
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 border-b border-[var(--border-default)] bg-[var(--status-info-bg)] px-4 py-2 pt-[calc(0.5rem+env(safe-area-inset-top))] text-[0.75rem] font-medium text-[var(--status-info-text)]"
    >
      <WifiOff className="size-3.5 shrink-0" />
      <span className="truncate">{t("offline.banner")}</span>
    </div>
  )
}
