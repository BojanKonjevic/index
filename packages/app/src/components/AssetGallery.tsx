import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react"
import type { MaterialAsset } from "@index/shared"
import { useState, useCallback } from "react"

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
  const [zoom, setZoom] = useState(1)

  const current = assets[index]
  const hasPrev = index > 0
  const hasNext = index < assets.length - 1

  const goTo = useCallback(
    (i: number) => {
      setIndex(i)
      setZoom(1)
      onIndexChange?.(i)
    },
    [onIndexChange],
  )

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    setZoom((z) => {
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      return Math.min(Math.max(z * delta, 0.1), 5)
    })
  }, [])

  if (assets.length === 0) return null

  return (
    <div className="flex flex-col h-full">
      <div
        onWheel={handleWheel}
        className="flex-1 flex items-center justify-center overflow-hidden bg-[var(--bg-surface)] relative"
      >
        {hasPrev && (
          <button
            onClick={() => goTo(index - 1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 flex size-10 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors cursor-pointer"
          >
            <ChevronLeft className="size-5" />
          </button>
        )}
        {hasNext && (
          <button
            onClick={() => goTo(index + 1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex size-10 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors cursor-pointer"
          >
            <ChevronRight className="size-5" />
          </button>
        )}

        <img
          src={current.url}
          alt=""
          style={{ transform: `scale(${zoom})` }}
          className="max-w-none transition-transform duration-100"
          draggable={false}
        />

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-lg border bg-[var(--bg-surface)] px-2 py-1.5 shadow-md border-[var(--border-default)]">
          <button
            onClick={() => setZoom((z) => Math.max(z / 1.25, 0.1))}
            disabled={zoom <= 0.1}
            className="flex size-8 items-center justify-center rounded text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] disabled:opacity-30 cursor-pointer"
          >
            <ZoomOut className="size-4" />
          </button>
          <span className="text-[0.688rem] font-medium text-[var(--text-secondary)] tabular-nums">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(z * 1.25, 5))}
            disabled={zoom >= 5}
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
              className={`shrink-0 size-14 rounded border-2 overflow-hidden transition-all duration-100 cursor-pointer ${
                i === index
                  ? "border-[var(--accent)] opacity-100"
                  : "border-transparent opacity-60 hover:opacity-90"
              }`}
            >
              <img src={a.url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
