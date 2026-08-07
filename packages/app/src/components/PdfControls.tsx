import { ZoomIn, ZoomOut, Maximize, ChevronLeft, ChevronRight } from "lucide-react"
import { useI18n } from "@/hooks/useI18n"

interface PdfControlsProps {
  pageNum: number
  numPages: number
  pageInput: string
  zoom: number
  onPageInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onPageInputCommit: () => void
  onPageInputKeyDown: (e: React.KeyboardEvent) => void
  onZoomIn: () => void
  onZoomOut: () => void
  onFitWidth: () => void
  onGoToPage: (num: number) => void
  atMaxZoom: boolean
  atMinZoom: boolean
  variant?: "desktop" | "mobile"
}

export function PdfControls({
  pageNum,
  numPages,
  pageInput,
  zoom,
  onPageInputChange,
  onPageInputCommit,
  onPageInputKeyDown,
  onZoomIn,
  onZoomOut,
  onFitWidth,
  onGoToPage,
  atMaxZoom,
  atMinZoom,
  variant = "desktop",
}: PdfControlsProps) {
  const { t } = useI18n()

  if (variant === "mobile") {
    return (
      <>
        <button
          onClick={() => onGoToPage(pageNum - 1)}
          disabled={pageNum <= 1}
          aria-label={t("viewer.gallery_prev")}
          className="flex items-center justify-center min-h-[2.75rem] min-w-0 px-2 rounded-[0.438rem] text-[var(--text-secondary)] transition-all duration-100 hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:pointer-events-none"
        >
          <ChevronLeft className="size-5" />
        </button>

        <span className="flex min-w-0 items-center gap-1 px-1 text-[0.813rem] text-[var(--text-secondary)]">
          <input
            type="text"
            value={pageInput}
            onChange={onPageInputChange}
            onBlur={onPageInputCommit}
            onKeyDown={onPageInputKeyDown}
            className="w-9 rounded border border-[var(--border-default)] px-1 py-1 text-center text-sm outline-none bg-[var(--bg-subtle)] text-[var(--text-primary)]"
          />
          <span className="text-[var(--text-hint)]">/</span>
          <span>{numPages || "?"}</span>
        </span>

        <button
          onClick={() => onGoToPage(pageNum + 1)}
          disabled={pageNum >= numPages}
          aria-label={t("viewer.gallery_next")}
          className="flex items-center justify-center min-h-[2.75rem] min-w-0 px-2 rounded-[0.438rem] text-[var(--text-secondary)] transition-all duration-100 hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:pointer-events-none"
        >
          <ChevronRight className="size-5" />
        </button>
      </>
    )
  }

  return (
    <>
      <span className="flex items-center gap-1 whitespace-nowrap px-1.5 text-[0.813rem] text-[var(--text-secondary)]">
        <input
          type="text"
          value={pageInput}
          onChange={onPageInputChange}
          onBlur={onPageInputCommit}
          onKeyDown={onPageInputKeyDown}
          className="w-14 rounded border border-[var(--border-default)] px-1 py-1 text-center text-sm outline-none bg-[var(--bg-subtle)] text-[var(--text-primary)]"
        />
        <span className="text-[var(--text-hint)]">/</span>
        <span>{numPages || "?"}</span>
      </span>

      <span className="mx-1 h-5 w-px bg-[var(--border-faint)]" />

      <button
        onClick={onZoomOut}
        disabled={atMinZoom}
        aria-label={t("viewer.zoom_out")}
        className="flex size-9 items-center justify-center rounded-[0.438rem] text-[var(--text-secondary)] transition-all duration-100 hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:pointer-events-none"
        title={t("viewer.zoom_out")}
      >
        <ZoomOut className="size-4" />
      </button>
      <span className="w-8 text-center text-[0.688rem] font-medium text-[var(--text-secondary)] tabular-nums">
        {Math.round(zoom * 100)}%
      </span>
      <button
        onClick={onZoomIn}
        disabled={atMaxZoom}
        aria-label={t("viewer.zoom_in")}
        className="flex size-9 items-center justify-center rounded-[0.438rem] text-[var(--text-secondary)] transition-all duration-100 hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:pointer-events-none"
        title={t("viewer.zoom_in")}
      >
        <ZoomIn className="size-4" />
      </button>
      <button
        onClick={onFitWidth}
        aria-label={t("viewer.fit_width")}
        className="flex size-9 items-center justify-center rounded-[0.438rem] text-[var(--text-secondary)] transition-all duration-100 hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
        title={t("viewer.fit_width")}
      >
        <Maximize className="size-4" />
      </button>

      <span className="mx-1 h-5 w-px bg-[var(--border-faint)]" />
    </>
  )
}
