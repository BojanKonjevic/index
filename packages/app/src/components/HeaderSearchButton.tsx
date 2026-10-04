import { Search } from "lucide-react"
import { useSearchPalette } from "@/hooks/useSearchPalette"
import { useI18n } from "@/hooks/useI18n"
import { cn } from "@/lib/utils"

export function HeaderSearchButton({
  className,
  hideOnMobile = false,
}: {
  className?: string
  hideOnMobile?: boolean
}) {
  const { openPalette } = useSearchPalette()
  const { t } = useI18n()

  return (
    <button
      onClick={openPalette}
      aria-label={t("nav.search")}
      className={cn(
        "flex h-10 cursor-pointer items-center gap-2 rounded-[0.5rem] border border-[var(--border-default)] bg-[var(--bg-subtle)] px-3 text-[0.875rem] text-[var(--text-hint)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]",
        hideOnMobile && "max-md:hidden",
        className,
      )}
    >
      <Search className="size-4 shrink-0" />
      <span className="hidden flex-1 truncate text-left sm:inline">{t("nav.search")}</span>
      <kbd className="hidden rounded border border-[var(--border-faint)] px-1 font-sans text-[0.625rem] lg:inline">
        ⌘K
      </kbd>
    </button>
  )
}
