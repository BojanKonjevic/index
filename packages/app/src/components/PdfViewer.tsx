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
  onLoadSuccess: (numPages: number, naturalPageWidth: number, naturalPageHeight: number) => void
  onLoadError: (error: string) => void
  setPdfLoading: (loading: boolean) => void
  onPageChange: (pageNum: number) => void
  pdfLoading: boolean
  pdfError: string | null
  hl?: string | null
  hlPage?: number | null
  onHighlightCount?: (count: number) => void
}

export default function PdfViewer({
  url,
  zoom,
  cssScale,
  inverted,
  parentRef,
  numPages,
  naturalPageHeight,
  onLoadSuccess,
  onLoadError,
  setPdfLoading,
  onPageChange,
  pdfLoading,
  pdfError,
  hl = null,
  hlPage = null,
  onHighlightCount,
}: PdfViewerProps) {
  const { t } = useI18n()
  const rafId = useRef<number | null>(null)
  const [range, setRange] = useState({ start: 0, end: 0 })

  const pageHeight = naturalPageHeight !== null ? naturalPageHeight * zoom + 16 : 842
  const totalHeight = numPages * pageHeight

  const updateRange = useCallback(() => {
    const el = parentRef.current
    if (!el || naturalPageHeight === null || numPages === 0) return

    const scrollTop = el.scrollTop
    const viewH = el.clientHeight

    const first = Math.floor(scrollTop / pageHeight)
    const last = Math.ceil((scrollTop + viewH) / pageHeight)

    const start = Math.max(0, first - BUFFER)
    const end = Math.min(numPages, last + BUFFER)

    setRange({ start, end })

    const mid = Math.round((scrollTop + viewH / 2) / pageHeight)
    onPageChange(Math.max(1, Math.min(mid + 1, numPages)))
  }, [parentRef, naturalPageHeight, numPages, pageHeight, onPageChange])

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
    observer.observe(root, { childList: true, subtree: true })

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
            position: "relative",
            transform: cssScale && cssScale !== 1 ? `scale(${cssScale})` : undefined,
            transformOrigin: "center top",
            transition: cssScale && cssScale !== 1 ? "transform 200ms ease-in-out" : undefined,
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
