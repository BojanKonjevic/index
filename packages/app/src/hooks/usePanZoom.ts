import { useState, useCallback, useRef, useEffect, type RefObject } from "react"

function fitZoom(containerW: number, containerH: number, naturalW: number, naturalH: number) {
  return Math.min((containerW - 64) / naturalW, (containerH - 64) / naturalH, 1)
}

export function usePanZoom(
  containerRef: RefObject<HTMLDivElement | null>,
  imgRef: RefObject<HTMLImageElement | null>,
) {
  const [zoom, setZoom] = useState(1)
  const zoomRef = useRef(zoom)
  useEffect(() => {
    zoomRef.current = zoom
  }, [zoom])
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const containerSize = useRef({ w: 0, h: 0 })
  const isDragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 })

  useEffect(() => {
    if (containerRef.current) {
      containerSize.current = {
        w: containerRef.current.clientWidth,
        h: containerRef.current.clientHeight,
      }
    }
  }, [containerRef])

  const resetView = useCallback(() => {
    setOffset({ x: 0, y: 0 })
    if (containerRef.current) {
      containerSize.current = {
        w: containerRef.current.clientWidth,
        h: containerRef.current.clientHeight,
      }
    }
  }, [containerRef])

  const setZoomWithFit = useCallback((naturalW: number, naturalH: number) => {
    const { w, h } = containerSize.current
    setZoom(fitZoom(w, h, naturalW, naturalH))
  }, [])

  const clampOffset = useCallback((x: number, y: number) => {
    const img = imgRef.current
    if (!img) return { x, y }
    const cw = containerSize.current.w
    const ch = containerSize.current.h
    const iw = img.clientWidth
    const ih = img.clientHeight
    const z = zoomRef.current
    const maxX = Math.max(0, (iw * z - cw) / 2)
    const maxY = Math.max(0, (ih * z - ch) / 2)
    return {
      x: Math.min(Math.max(x, -maxX), maxX),
      y: Math.min(Math.max(y, -maxY), maxY),
    }
  }, [])

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

  const handleZoomIn = () => setZoom((z) => Math.min(z * 1.25, 5))
  const handleZoomOut = () => setZoom((z) => Math.max(z / 1.25, 0.1))

  return {
    zoom,
    setZoom,
    zoomRef,
    offset,
    setOffset,
    isPanning,
    containerSize,
    resetView,
    setZoomWithFit,
    handlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onWheel: handleWheel,
    },
    handleZoomIn,
    handleZoomOut,
  }
}
