import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react"
import type { MaterialAsset } from "@index/shared"
import { useState, useCallback, useRef, useEffect } from "react"
import { usePanZoom } from "@/hooks/usePanZoom"
import { useI18n } from "@/hooks/useI18n"

export default function AssetGallery({
  assets,
  initialIndex = 0,
  onIndexChange,
}: {
  assets: MaterialAsset[]
  initialIndex?: number
  onIndexChange?: (index: number) => void
}) {
  const [index, setIndex] = useState(Math.min(initialIndex, Math.max(assets.length - 1, 0)))
  const { t } = useI18n()
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const naturalSizes = useRef<Map<string, { w: number; h: number }>>(new Map())

  const {
    zoom,
    setZoom,
    setOffset,
    offset,
    isPanning,
    isPinching,
    containerSize,
    resetView,
    setZoomWithFit,
    handlers,
    handleZoomIn,
    handleZoomOut,
  } = usePanZoom(containerRef, imgRef)

  const current = assets[index]
  const hasPrev = index > 0
  const hasNext = index < assets.length - 1

  useEffect(() => {
    const clamped = Math.min(initialIndex, Math.max(assets.length - 1, 0))
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIndex(clamped)
    setOffset({ x: 0, y: 0 })
    const cached = naturalSizes.current.get(assets[clamped]?.url)
    if (cached) {
      setZoomWithFit(cached.w, cached.h)
    }
  }, [initialIndex, assets, setOffset, setZoomWithFit])

  const goTo = useCallback(
    (i: number) => {
      setIndex(i)
      resetView()
      const cached = naturalSizes.current.get(assets[i]?.url)
      if (cached) {
        setZoomWithFit(cached.w, cached.h)
      } else {
        setZoom(1)
      }
      onIndexChange?.(i)
    },
    [onIndexChange, assets, resetView, setZoomWithFit, setZoom],
  )

  if (assets.length === 0) return null

  return (
    <div className="grid grid-rows-[1fr_auto] flex-1 min-h-0">
      <div
        ref={containerRef}
        onWheel={handlers.onWheel}
        onPointerDown={handlers.onPointerDown}
        onPointerMove={handlers.onPointerMove}
        onPointerUp={handlers.onPointerUp}
        onPointerCancel={handlers.onPointerCancel}
        className="flex items-center justify-center overflow-hidden bg-[var(--bg-surface)] relative select-none"
        style={{ touchAction: "none" }}
      >
        {hasPrev && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              goTo(index - 1)
            }}
            aria-label={t("viewer.gallery_prev")}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 flex size-10 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors cursor-pointer"
          >
            <ChevronLeft className="size-5" />
          </button>
        )}
        {hasNext && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              goTo(index + 1)
            }}
            aria-label={t("viewer.gallery_next")}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex size-10 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors cursor-pointer"
          >
            <ChevronRight className="size-5" />
          </button>
        )}

        <img
          ref={imgRef}
          src={current.url}
          alt=""
          onLoad={(e) => {
            const img = e.target as HTMLImageElement
            if (containerSize.current.w > 0 && img.naturalWidth > 0) {
              setZoomWithFit(img.naturalWidth, img.naturalHeight)
              naturalSizes.current.set(current.url, { w: img.naturalWidth, h: img.naturalHeight })
            }
          }}
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
          }}
          className={`max-w-none ${isPanning ? "cursor-grabbing" : "cursor-grab"} ${isPanning || isPinching ? "" : "transition-transform duration-100"}`}
          draggable={false}
        />

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-lg border bg-[var(--bg-surface)] px-2 py-1.5 shadow-md border-[var(--border-default)]">
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleZoomOut()
            }}
            disabled={zoom <= 0.1}
            aria-label={t("viewer.zoom_out")}
            className="flex size-8 items-center justify-center rounded text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] disabled:opacity-30 cursor-pointer"
          >
            <ZoomOut className="size-4" />
          </button>
          <span className="text-[0.688rem] font-medium text-[var(--text-secondary)] tabular-nums">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleZoomIn()
            }}
            disabled={zoom >= 5}
            aria-label={t("viewer.zoom_in")}
            className="flex size-8 items-center justify-center rounded text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] disabled:opacity-30 cursor-pointer"
          >
            <ZoomIn className="size-4" />
          </button>
          <span className="ml-2 text-[0.688rem] text-[var(--text-hint)]">
            {index + 1}/{assets.length}
          </span>
        </div>
      </div>

      {assets.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto px-3 py-2 border-t border-[var(--border-default)] bg-[var(--bg-surface)] shrink-0">
          {assets.map((a, i) => (
            <button
              key={a.id}
              onClick={() => goTo(i)}
              aria-label={t("viewer.gallery_thumbnail_fmt", { n: i + 1, total: assets.length })}
              className={`shrink-0 size-14 rounded border-2 overflow-hidden transition-all duration-100 cursor-pointer bg-cover bg-center bg-[var(--bg-subtle)] ${
                i === index
                  ? "border-[var(--accent)] opacity-100"
                  : "border-transparent opacity-60 hover:opacity-90"
              }`}
              style={{ backgroundImage: `url(${a.url})` }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
