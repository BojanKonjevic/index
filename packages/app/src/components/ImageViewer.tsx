import { ZoomIn, ZoomOut } from "lucide-react"
import { useI18n } from "@/hooks/useI18n"
import { useState, useRef, useCallback } from "react"

function fitZoom(containerW: number, containerH: number, naturalW: number, naturalH: number) {
  return Math.min((containerW - 64) / naturalW, (containerH - 64) / naturalH, 1)
}

export default function ImageViewer({ url }: { url: string }) {
  const { t } = useI18n()
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const containerSize = useRef({ w: 0, h: 0 })
  const isDragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 })
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)

  const clampOffset = useCallback(
    (x: number, y: number) => {
      const img = imgRef.current
      if (!img) return { x, y }
      const cw = containerSize.current.w
      const ch = containerSize.current.h
      const iw = img.clientWidth
      const ih = img.clientHeight
      const maxX = Math.max(0, (iw * zoom - cw) / 2)
      const maxY = Math.max(0, (ih * zoom - ch) / 2)
      return {
        x: Math.min(Math.max(x, -maxX), maxX),
        y: Math.min(Math.max(y, -maxY), maxY),
      }
    },
    [zoom],
  )

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return
      isDragging.current = true
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        offsetX: offset.x,
        offsetY: offset.y,
      }
      setIsPanning(true)
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    },
    [offset],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return
      const dx = e.clientX - dragStart.current.x
      const dy = e.clientY - dragStart.current.y
      const newOffset = clampOffset(dragStart.current.offsetX + dx, dragStart.current.offsetY + dy)
      setOffset(newOffset)
    },
    [clampOffset],
  )

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    isDragging.current = false
    setIsPanning(false)
    ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
  }, [])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    setZoom((z) => {
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      return Math.min(Math.max(z * delta, 0.1), 5)
    })
  }, [])

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className="flex-1 flex items-center justify-center overflow-hidden bg-[var(--bg-surface)] relative select-none"
      style={{ touchAction: isPanning ? "none" : "pinch-zoom" }}
    >
      {loading && !error && (
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
          setLoading(false)
          const img = e.target as HTMLImageElement
          const container = containerRef.current
          if (container && img.naturalWidth > 0) {
            containerSize.current = {
              w: container.clientWidth,
              h: container.clientHeight,
            }
            setZoom(
              fitZoom(
                container.clientWidth,
                container.clientHeight,
                img.naturalWidth,
                img.naturalHeight,
              ),
            )
          }
        }}
        onError={() => setError(true)}
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
        }}
        className={`max-w-none ${isPanning ? "cursor-grabbing" : "cursor-grab"} ${isPanning ? "" : "transition-transform duration-100"}`}
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
