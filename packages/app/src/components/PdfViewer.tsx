import { Document, Page, pdfjs } from "react-pdf"
import "react-pdf/dist/Page/TextLayer.css"
import "react-pdf/dist/Page/AnnotationLayer.css"
import { useI18n } from "@/hooks/useI18n"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useEffect, type RefObject } from "react"
import type { Virtualizer } from "@tanstack/react-virtual"

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"

interface PdfViewerProps {
  url: string
  zoom: number
  inverted: boolean
  parentRef: RefObject<HTMLDivElement | null>
  virtualizer: Virtualizer<HTMLDivElement, Element>
  onLoadSuccess: (numPages: number, naturalPageWidth: number) => void
  onLoadError: (error: string) => void
  setPdfLoading: (loading: boolean) => void
  handleScroll: () => void
  pdfLoading: boolean
  pdfError: string | null
}

export default function PdfViewer({
  url,
  zoom,
  inverted,
  parentRef,
  virtualizer,
  onLoadSuccess,
  onLoadError,
  setPdfLoading,
  handleScroll,
  pdfLoading,
  pdfError,
}: PdfViewerProps) {
  const { t } = useI18n()

  useEffect(() => {
    virtualizer.measure()
  }, [zoom, virtualizer])

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
          onLoadSuccess(
            pdf.numPages,
            await pdf.getPage(1).then((p) => p.getViewport({ scale: 1 }).width),
          )
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

        <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
          {virtualizer.getVirtualItems().map((virtualItem) => (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: virtualItem.start,
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
                  pageNumber={virtualItem.index + 1}
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
