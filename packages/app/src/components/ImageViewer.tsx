import { ZoomIn, ZoomOut } from "lucide-react"
import { useI18n } from "@/hooks/useI18n"
import { useState, useRef, useCallback } from "react"

export default function ImageViewer({ url }: { url: string }) {
  const { t } = useI18n()
  const [zoom, setZoom] = useState(1)
  const imgRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 })
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 })
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  const measure = useCallback(() => {
    if (containerRef.current) {
      setContainerSize({
        w: containerRef.current.clientWidth,
        h: containerRef.current.clientHeight,
      })
    }
  }, [])

  const refCallback = useCallback(
    (node: HTMLDivElement | null) => {
      if (node) {
        containerRef.current = node
        measure()
        const ro = new ResizeObserver(measure)
        ro.observe(node)
      }
    },
    [measure],
  )

  const fitScale =
    naturalSize.w > 0 && containerSize.w > 0
      ? Math.min((containerSize.w - 64) / naturalSize.w, (containerSize.h - 64) / naturalSize.h, 1)
      : 1

  const displayZoom = zoom * fitScale

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    setZoom((z) => {
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      return Math.min(Math.max(z * delta, 0.1), 5)
    })
  }, [])

  return (
    <div
      ref={refCallback}
      onWheel={handleWheel}
      className="flex-1 flex items-center justify-center overflow-hidden bg-[var(--bg-surface)] relative"
    >
      {!loaded && !error && (
        <div className="text-sm text-[var(--text-secondary)]">{t("viewer.loading")}</div>
      )}
      {error && (
        <div className="text-sm text-[var(--text-secondary)]">
          {t("viewer.load_error_fmt", { type: t("materialType.image") })}
        </div>
      )}
      <img
        ref={imgRef}
        src={url}
        alt=""
        onLoad={(e) => {
          setLoaded(true)
          setNaturalSize({
            w: (e.target as HTMLImageElement).naturalWidth,
            h: (e.target as HTMLImageElement).naturalHeight,
          })
        }}
        onError={() => setError(true)}
        style={{
          transform: `scale(${displayZoom})`,
          opacity: loaded ? 1 : 0,
        }}
        className="max-w-none transition-transform duration-100"
        draggable={false}
      />

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-lg border bg-[var(--bg-surface)] px-2 py-1.5 shadow-md border-[var(--border-default)]">
        <button
          onClick={() => setZoom((z) => Math.max(z / 1.25, 0.1))}
          disabled={zoom <= 0.1}
          className="flex size-8 items-center justify-center rounded text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] disabled:opacity-30"
        >
          <ZoomOut className="size-4" />
        </button>
        <span className="w-10 text-center text-[0.688rem] font-medium text-[var(--text-secondary)] tabular-nums">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom((z) => Math.min(z * 1.25, 5))}
          disabled={zoom >= 5}
          className="flex size-8 items-center justify-center rounded text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] disabled:opacity-30"
        >
          <ZoomIn className="size-4" />
        </button>
      </div>
    </div>
  )
}
