import { Document, Page, pdfjs } from "react-pdf"
import "react-pdf/dist/Page/TextLayer.css"
import "react-pdf/dist/Page/AnnotationLayer.css"
import { useI18n } from "@/hooks/useI18n"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useEffect, useRef, useState, useCallback, type RefObject } from "react"
import { clearHighlights, getOrderedMarks, getTextLayer, highlightMatches } from "@/lib/textLayer"

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"

const BUFFER = 4

interface PdfViewerProps {
  url: string
  zoom: number
  cssScale?: number
  inverted: boolean
  parentRef: RefObject<HTMLDivElement | null>
  numPages: number
  naturalPageHeight: number | null
  minZoom: number
  maxZoom: number
  /** Fit-width zoom as computed by the parent's state machine. Pinch/double-tap
   *  must land on exactly this value or a double-tap produces a visible jump. */
  fitWidthZoom: number | null
  onLoadSuccess: (numPages: number, naturalPageWidth: number, naturalPageHeight: number) => void
  onLoadError: (error: string) => void
  setPdfLoading: (loading: boolean) => void
  onPageChange: (pageNum: number) => void
  onUserZoom: (zoom: number | null, fitWidth: boolean) => void
  onUserScale: (scale: number) => void
  onUserGestureEnd: () => void
  pdfLoading: boolean
  pdfError: string | null
  hl?: string | null
  hlPage?: number | null
  onHighlightCount?: (count: number) => void
}

interface GestureState {
  pointers: Map<number, { x: number; y: number }>
  mode: "none" | "pan" | "pinch"
  startX: number
  startY: number
  startScrollLeft: number
  startScrollTop: number
  anchorX: number
  anchorY: number
  moved: boolean
  startDist: number
  baseZoom: number
  downAt: number
  downX: number
  downY: number
}

export default function PdfViewer({
  url,
  zoom,
  cssScale,
  inverted,
  parentRef,
  numPages,
  naturalPageHeight,
  minZoom,
  maxZoom,
  fitWidthZoom,
  onLoadSuccess,
  onLoadError,
  setPdfLoading,
  onPageChange,
  onUserZoom,
  onUserScale,
  onUserGestureEnd,
  pdfLoading,
  pdfError,
  hl = null,
  hlPage = null,
  onHighlightCount,
}: PdfViewerProps) {
  const { t } = useI18n()
  const rafId = useRef<number | null>(null)
  const [range, setRange] = useState({ start: 0, end: 0 })

  const [coarse] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches,
  )
  const [docWidth, setDocWidth] = useState<{ url: string; width: number } | null>(null)
  const [viewWidth, setViewWidth] = useState(0)
  const [pinching, setPinching] = useState(false)
  const pinchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const padRef = useRef({ left: 0, top: 0 })

  const gestureRef = useRef<GestureState>({
    pointers: new Map(),
    mode: "none",
    startX: 0,
    startY: 0,
    startScrollLeft: 0,
    startScrollTop: 0,
    anchorX: 0,
    anchorY: 0,
    moved: false,
    startDist: 0,
    baseZoom: 1,
    downAt: 0,
    downX: 0,
    downY: 0,
  })
  const lastTapRef = useRef<{ at: number; x: number; y: number } | null>(null)

  useEffect(() => {
    const el = parentRef.current
    if (!el) return
    const cs = window.getComputedStyle(el)
    padRef.current = {
      left: parseFloat(cs.paddingLeft) || 0,
      top: parseFloat(cs.paddingTop) || 0,
    }
  }, [parentRef])

  useEffect(() => {
    const el = parentRef.current
    if (!el) return
    const update = () => setViewWidth(Math.round(el.clientWidth))
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [parentRef])

  const zoomed = viewWidth > 0 && docWidth?.url === url && docWidth.width * zoom > viewWidth

  const handleDoubleTap = (clientX: number, clientY: number) => {
    const el = parentRef.current
    if (!el || !docWidth || docWidth.url !== url || viewWidth === 0) return
    if (fitWidthZoom === null) return
    const rect = el.getBoundingClientRect()
    const ax = clientX - rect.left - padRef.current.left
    const ay = clientY - rect.top - padRef.current.top
    const fitZoom = fitWidthZoom
    if (docWidth.width * zoom > viewWidth) {
      const ratio = fitZoom / zoom
      el.scrollTo({ left: 0, top: Math.max(0, (el.scrollTop + ay) * ratio - ay) })
      onUserZoom(null, true)
    } else {
      const target = Math.min(Math.max(fitZoom * 2, minZoom), maxZoom)
      const ratio = target / zoom
      el.scrollTo({
        left: Math.max(0, (el.scrollLeft + ax) * ratio - ax),
        top: Math.max(0, (el.scrollTop + ay) * ratio - ay),
      })
      onUserZoom(target, false)
    }
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!coarse) return
    const el = parentRef.current
    if (!el || !docWidth || docWidth.url !== url) return
    gestureRef.current.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (gestureRef.current.pointers.size === 2) {
      const [a, b] = Array.from(gestureRef.current.pointers.values())
      gestureRef.current.mode = "pinch"
      gestureRef.current.moved = true
      gestureRef.current.startDist = Math.hypot(a.x - b.x, a.y - b.y)
      gestureRef.current.baseZoom = zoom
      gestureRef.current.anchorX = (a.x + b.x) / 2 - padRef.current.left
      gestureRef.current.anchorY = (a.y + b.y) / 2 - padRef.current.top
      gestureRef.current.startScrollLeft = el.scrollLeft
      gestureRef.current.startScrollTop = el.scrollTop
      setPinching(true)
      onUserZoom(zoom, false)
      return
    }

    if (e.isPrimary) {
      gestureRef.current.mode = "pan"
      gestureRef.current.startX = e.clientX
      gestureRef.current.startY = e.clientY
      gestureRef.current.startScrollLeft = el.scrollLeft
      gestureRef.current.startScrollTop = el.scrollTop
      gestureRef.current.downAt = performance.now()
      gestureRef.current.downX = e.clientX
      gestureRef.current.downY = e.clientY
      gestureRef.current.moved = false
    }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!coarse) return
    const el = parentRef.current
    if (!el || !gestureRef.current.pointers.has(e.pointerId)) return
    gestureRef.current.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (gestureRef.current.mode === "pinch" && gestureRef.current.pointers.size === 2) {
      const [a, b] = Array.from(gestureRef.current.pointers.values())
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      const target = Math.min(
        Math.max(gestureRef.current.baseZoom * (dist / gestureRef.current.startDist), minZoom),
        maxZoom,
      )
      const s = target / gestureRef.current.baseZoom
      const midX = (a.x + b.x) / 2 - padRef.current.left
      const midY = (a.y + b.y) / 2 - padRef.current.top
      const anchorContentX = gestureRef.current.startScrollLeft + gestureRef.current.anchorX
      const anchorContentY = gestureRef.current.startScrollTop + gestureRef.current.anchorY
      el.scrollTo({
        left: Math.max(0, anchorContentX * s - midX),
        top: Math.max(0, anchorContentY * s - midY),
      })
      onUserScale(s)
      return
    }

    if (gestureRef.current.mode === "pan") {
      const dx = e.clientX - gestureRef.current.startX
      const dy = e.clientY - gestureRef.current.startY
      if (!gestureRef.current.moved && Math.abs(dx) + Math.abs(dy) > 8) {
        gestureRef.current.moved = true
        lastTapRef.current = null
      }
      if (gestureRef.current.moved) {
        el.scrollTo({
          left: Math.max(0, gestureRef.current.startScrollLeft - dx),
          top: Math.max(0, gestureRef.current.startScrollTop - dy),
        })
      }
    }
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!coarse) return
    gestureRef.current.pointers.delete(e.pointerId)

    if (gestureRef.current.mode === "pinch") {
      if (gestureRef.current.pointers.size === 0) {
        gestureRef.current.mode = "none"
        onUserGestureEnd()
        if (pinchTimeoutRef.current) clearTimeout(pinchTimeoutRef.current)
        pinchTimeoutRef.current = window.setTimeout(() => {
          setPinching(false)
        }, 250)
      }
      return
    }

    if (gestureRef.current.mode === "pan" && gestureRef.current.pointers.size === 0) {
      gestureRef.current.mode = "none"
      const now = performance.now()
      const dx = e.clientX - gestureRef.current.downX
      const dy = e.clientY - gestureRef.current.downY
      const last = lastTapRef.current
      if (
        !gestureRef.current.moved &&
        now - gestureRef.current.downAt < 300 &&
        Math.abs(dx) < 12 &&
        Math.abs(dy) < 12
      ) {
        if (
          last &&
          now - last.at < 300 &&
          Math.abs(e.clientX - last.x) < 24 &&
          Math.abs(e.clientY - last.y) < 24
        ) {
          lastTapRef.current = null
          handleDoubleTap(e.clientX, e.clientY)
          return
        }
        lastTapRef.current = { at: now, x: e.clientX, y: e.clientY }
      } else {
        lastTapRef.current = null
      }
    }
  }

  const handlePointerCancel = () => {
    if (!coarse) return
    gestureRef.current.pointers.clear()
    gestureRef.current.mode = "none"
    if (pinching) {
      onUserGestureEnd()
      setPinching(false)
    }
    lastTapRef.current = null
  }

  const pageHeight = naturalPageHeight !== null ? naturalPageHeight * zoom + 16 : 842
  const totalHeight = numPages * pageHeight

  const updateRange = useCallback(() => {
    const el = parentRef.current
    if (!el || naturalPageHeight === null || numPages === 0) return

    const scale = cssScale && cssScale !== 1 ? cssScale : 1
    const layoutTop = el.scrollTop / scale
    const layoutViewH = el.clientHeight / scale

    const first = Math.floor(layoutTop / pageHeight)
    const last = Math.ceil((layoutTop + layoutViewH) / pageHeight)

    const start = Math.max(0, first - BUFFER)
    const end = Math.min(numPages, last + BUFFER)

    setRange({ start, end })

    const mid = Math.round((layoutTop + layoutViewH / 2) / pageHeight)
    onPageChange(Math.max(1, Math.min(mid + 1, numPages)))
  }, [parentRef, naturalPageHeight, numPages, pageHeight, cssScale, onPageChange])

  useEffect(() => {
    updateRange()
  }, [numPages, naturalPageHeight, zoom, updateRange])

  const handleScroll = useCallback(() => {
    if (rafId.current) cancelAnimationFrame(rafId.current)
    rafId.current = requestAnimationFrame(() => {
      updateRange()
      rafId.current = null
    })
  }, [updateRange])

  useEffect(() => {
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current)
      if (pinchTimeoutRef.current) clearTimeout(pinchTimeoutRef.current)
    }
  }, [])

  const onHighlightCountRef = useRef(onHighlightCount)
  useEffect(() => {
    onHighlightCountRef.current = onHighlightCount
  }, [onHighlightCount])

  const scrolledForRef = useRef<{ hl: string; page: number } | null>(null)
  useEffect(() => {
    scrolledForRef.current = null
  }, [url])

  useEffect(() => {
    const root = parentRef.current
    const page = hlPage ?? 1
    const notify = (n: number) => onHighlightCountRef.current?.(n)

    if (root) {
      for (const layer of root.querySelectorAll<HTMLElement>(".react-pdf__Page__textContent")) {
        clearHighlights(layer)
      }
    }

    if (!hl) {
      notify(0)
      return
    }
    if (!root) return

    let done = false
    const tryHighlight = () => {
      if (done) return
      const layer = getTextLayer(root, page)
      if (!layer) return
      clearHighlights(layer)
      const hasText = Array.from(layer.querySelectorAll("span")).some(
        (s) => (s.textContent ?? "").trim().length > 0,
      )
      if (!hasText) return
      notify(highlightMatches(layer, hl))
      done = true
      if (scrolledForRef.current?.hl !== hl || scrolledForRef.current?.page !== page) {
        scrolledForRef.current = { hl, page }
        const marks = getOrderedMarks(layer)
        if (marks.length > 0) {
          requestAnimationFrame(() => {
            marks[0].scrollIntoView({ block: "center", behavior: "smooth" })
          })
        }
      }
    }

    const observer = new MutationObserver(() => tryHighlight())
    observer.observe(root, { childList: true, subtree: true, characterData: true })

    tryHighlight()

    return () => {
      done = true
      observer.disconnect()
    }
  }, [hl, hlPage, zoom, parentRef, url, range])

  const pages: number[] = []
  for (let i = range.start; i < range.end; i++) {
    pages.push(i)
  }

  return (
    <div
      ref={parentRef}
      onScroll={handleScroll}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      style={{
        touchAction: coarse ? (zoomed ? "none" : "pan-y") : undefined,
      }}
      className={cn(
        "flex-1 overflow-auto md:px-8 px-0 py-6 transition-colors",
        inverted ? "bg-bg-surface" : "bg-pdf-bg",
      )}
    >
      <Document
        file={url}
        onLoadSuccess={async (pdf) => {
          setPdfLoading(false)
          const page1 = await pdf.getPage(1)
          const viewport = page1.getViewport({ scale: 1 })
          setDocWidth({ url, width: viewport.width })
          onLoadSuccess(pdf.numPages, viewport.width, viewport.height)
        }}
        onLoadError={() => {
          onLoadError(t("viewer.load_error_fmt", { type: t("materialType.pdf") || "PDF" }))
          setPdfLoading(false)
        }}
        loading={null}
      >
        {pdfLoading && (
          <div className="flex items-center gap-2 pt-20 text-sm text-[var(--text-secondary)]">
            <Loader2 className="size-5 animate-spin" />
            {t("viewer.loading")}
          </div>
        )}
        {pdfError && (
          <div className="flex items-center justify-center pt-20 text-sm text-[var(--text-secondary)]">
            {pdfError}
          </div>
        )}

        <div
          style={{
            height: totalHeight,
            minWidth: docWidth?.url === url ? docWidth.width * zoom : undefined,
            position: "relative",
            transform: cssScale && cssScale !== 1 ? `scale(${cssScale})` : undefined,
            transformOrigin: "left top",
            transition:
              cssScale && cssScale !== 1 && !pinching ? "transform 200ms ease-in-out" : undefined,
          }}
        >
          {pages.map((i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                top: i * pageHeight,
                left: 0,
                right: 0,
                display: "flex",
                justifyContent: "center",
                paddingBottom: "16px",
              }}
            >
              <div
                style={{
                  boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
                  filter: inverted ? "invert(1)" : "none",
                }}
              >
                <Page
                  pageNumber={i + 1}
                  scale={zoom}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  loading={null}
                />
              </div>
            </div>
          ))}
        </div>
      </Document>
    </div>
  )
}
