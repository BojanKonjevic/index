import { Download } from "lucide-react"
import { useI18n } from "@/hooks/useI18n"
import { cn } from "@/lib/utils"

interface Props {
  size?: "sm" | "xs"
  className?: string
}

export function OfflineBadge({ size = "sm", className }: Props) {
  const { t } = useI18n()
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium bg-[var(--status-info-bg)] text-[var(--status-info-text)]",
        size === "xs"
          ? "px-1.5 py-[0.063rem] text-[0.563rem] leading-snug"
          : "px-[0.438rem] py-[0.125rem] text-[0.688rem]",
        className,
      )}
    >
      <Download className={size === "xs" ? "size-2.5" : "size-3"} />
      {t("offline.available")}
    </span>
  )
}
