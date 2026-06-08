import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react"
import type { MaterialAsset } from "@index/shared"
import { useState, useCallback, useRef, useEffect } from "react"

function fitZoom(containerW: number, containerH: number, naturalW: number, naturalH: number) {
  return Math.min((containerW - 64) / naturalW, (containerH - 64) / naturalH, 1)
}

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
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const containerSize = useRef({ w: 0, h: 0 })
  const isDragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 })
  const naturalSizes = useRef<Map<string, { w: number; h: number }>>(new Map())

  const current = assets[index]
  const hasPrev = index > 0
  const hasNext = index < assets.length - 1

  useEffect(() => {
    if (containerRef.current) {
      containerSize.current = {
        w: containerRef.current.clientWidth,
        h: containerRef.current.clientHeight,
      }
    }
  }, [])

  useEffect(() => {
    const clamped = Math.min(initialIndex, Math.max(assets.length - 1, 0))
    setIndex(clamped)
    setOffset({ x: 0, y: 0 })
    const cached = naturalSizes.current.get(assets[clamped]?.url)
    if (cached) {
      const { w, h } = containerSize.current
      setZoom(fitZoom(w, h, cached.w, cached.h))
    } else {
      setZoom(1)
    }
  }, [initialIndex, assets.length])

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

  const goTo = useCallback(
    (i: number) => {
      setIndex(i)
      setOffset({ x: 0, y: 0 })
      if (containerRef.current) {
        containerSize.current = {
          w: containerRef.current.clientWidth,
          h: containerRef.current.clientHeight,
        }
      }
      const cached = naturalSizes.current.get(assets[i]?.url)
      if (cached) {
        const { w, h } = containerSize.current
        setZoom(fitZoom(w, h, cached.w, cached.h))
      } else {
        setZoom(1)
      }
      onIndexChange?.(i)
    },
    [onIndexChange, assets],
  )

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    setZoom((z) => {
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      return Math.min(Math.max(z * delta, 0.1), 5)
    })
  }, [])

  const handleZoomIn = () => setZoom((z) => Math.min(z * 1.25, 5))
  const handleZoomOut = () => setZoom((z) => Math.max(z / 1.25, 0.1))

  if (assets.length === 0) return null

  return (
    <div className="grid grid-rows-[1fr_auto] flex-1 min-h-0">
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="flex items-center justify-center overflow-hidden bg-[var(--bg-surface)] relative select-none"
        style={{ touchAction: isPanning ? "none" : "pinch-zoom" }}
      >
        {hasPrev && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              goTo(index - 1)
            }}
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
            const { w, h } = containerSize.current
            if (w > 0 && img.naturalWidth > 0) {
              const fit = fitZoom(w, h, img.naturalWidth, img.naturalHeight)
              setZoom(fit)
              naturalSizes.current.set(current.url, { w: img.naturalWidth, h: img.naturalHeight })
            }
          }}
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
          }}
          className={`max-w-none ${isPanning ? "cursor-grabbing" : "cursor-grab"} ${isPanning ? "" : "transition-transform duration-100"}`}
          draggable={false}
        />

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-lg border bg-[var(--bg-surface)] px-2 py-1.5 shadow-md border-[var(--border-default)]">
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleZoomOut()
            }}
            disabled={zoom <= 0.1}
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
