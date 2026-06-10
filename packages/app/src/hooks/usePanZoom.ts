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

  // Multi-touch state for pinch zoom
  const [isPinching, setIsPinching] = useState(false)
  const isPinchingRef = useRef(false)
  const trackedPointers = useRef<Map<number, { x: number; y: number }>>(new Map())
  const pinchStart = useRef<{
    dist: number
    zoom: number
    offset: { x: number; y: number }
  } | null>(null)
  const pinnedPointer = useRef<number | null>(null)

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
    pinnedPointer.current = null
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

  const clampOffset = useCallback(
    (x: number, y: number) => {
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
    },
    [imgRef],
  )

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      trackedPointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

      if (trackedPointers.current.size === 2) {
        isPinchingRef.current = true
        setIsPinching(true)
        isDragging.current = false

        const ptrs = Array.from(trackedPointers.current.values())
        const dist = Math.hypot(ptrs[0].x - ptrs[1].x, ptrs[0].y - ptrs[1].y)
        pinchStart.current = {
          dist,
          zoom: zoomRef.current,
          offset: { x: offset.x, y: offset.y },
        }

        const target = e.target as HTMLElement
        if (pinnedPointer.current !== null) {
          try {
            target.releasePointerCapture(pinnedPointer.current)
          } catch {
            /* pointer not captured */
          }
          pinnedPointer.current = null
        }
        setIsPanning(false)
        return
      }

      if (e.button !== 0) return

      isDragging.current = true
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        offsetX: offset.x,
        offsetY: offset.y,
      }
      setIsPanning(true)
      pinnedPointer.current = e.pointerId
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    },
    [offset],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      trackedPointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

      if (isPinchingRef.current && trackedPointers.current.size === 2 && pinchStart.current) {
        const ptrs = Array.from(trackedPointers.current.values())
        const dist = Math.hypot(ptrs[0].x - ptrs[1].x, ptrs[0].y - ptrs[1].y)
        const cx = (ptrs[0].x + ptrs[1].x) / 2
        const cy = (ptrs[0].y + ptrs[1].y) / 2

        const rect = containerRef.current?.getBoundingClientRect()
        if (!rect) return

        const relCx = cx - rect.left
        const relCy = cy - rect.top

        const scale = dist / pinchStart.current.dist
        const newZoom = Math.min(Math.max(pinchStart.current.zoom * scale, 0.1), 5)

        const zr = newZoom / pinchStart.current.zoom
        const cw = containerSize.current.w
        const ch = containerSize.current.h
        const rawX = pinchStart.current.offset.x * zr + (1 - zr) * (relCx - cw / 2)
        const rawY = pinchStart.current.offset.y * zr + (1 - zr) * (relCy - ch / 2)

        const clamped = clampOffset(rawX, rawY)
        setZoom(newZoom)
        setOffset(clamped)
        return
      }

      if (!isDragging.current) return
      const dx = e.clientX - dragStart.current.x
      const dy = e.clientY - dragStart.current.y
      const newOffset = clampOffset(dragStart.current.offsetX + dx, dragStart.current.offsetY + dy)
      setOffset(newOffset)
    },
    [clampOffset, containerRef],
  )

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    trackedPointers.current.delete(e.pointerId)

    if (isPinchingRef.current) {
      if (trackedPointers.current.size < 2) {
        isPinchingRef.current = false
        setIsPinching(false)
        pinchStart.current = null
      }
      return
    }

    isDragging.current = false
    setIsPanning(false)
    pinnedPointer.current = null
    try {
      ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {
      /* pointer not captured */
    }
  }, [])

  const handlePointerCancel = useCallback((e: React.PointerEvent) => {
    trackedPointers.current.delete(e.pointerId)
    if (isPinchingRef.current) {
      isPinchingRef.current = false
      setIsPinching(false)
      pinchStart.current = null
    }
    isDragging.current = false
    setIsPanning(false)
    pinnedPointer.current = null
    try {
      ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {
      /* pointer not captured */
    }
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
    isPinching,
    containerSize,
    resetView,
    setZoomWithFit,
    handlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerCancel,
      onWheel: handleWheel,
    },
    handleZoomIn,
    handleZoomOut,
  }
}
