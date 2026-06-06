import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import {
  ArrowLeft,
  ZoomIn,
  ZoomOut,
  Maximize,
  SunMoon,
  Star,
  FileText,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Layers,
} from "lucide-react"

import { fetchSubject } from "@/lib/api"
import { useBookmarks } from "@/hooks/useBookmarks"
import { useRecentlyOpened } from "@/hooks/useRecentlyOpened"
import { useI18n } from "@/hooks/useI18n"
import type { Material } from "@index/shared"
import { useState, useMemo, useRef, useEffect, useCallback } from "react"
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Document, Page, pdfjs } from "react-pdf"
import "react-pdf/dist/Page/TextLayer.css"
import "react-pdf/dist/Page/AnnotationLayer.css"
import { useVirtualizer } from "@tanstack/react-virtual"

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

export const Route = createFileRoute("/subjects/$subjectId/materials/$materialId/")({
  loader: ({ params }) => fetchSubject(params.subjectId),
  component: ViewerPage,
})

function ViewerPage() {
  const { subject, materials } = Route.useLoaderData()
  const { subjectId, materialId } = Route.useParams()
  const navigate = useNavigate()
  const { isBookmarked, addBookmark, removeBookmark } = useBookmarks()
  const { t } = useI18n()
  const [sidebarMode, setSidebarMode] = useState<"category" | "all">("category")
  const [materialsSheetOpen, setMaterialsSheetOpen] = useState(false)

  const [pageNum, setPageNum] = useState(1)
  const [numPages, setNumPages] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [inverted, setInverted] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(true)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [pageInput, setPageInput] = useState("1")
  const [naturalPageWidth, setNaturalPageWidth] = useState<number | null>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [fitWidthMode, setFitWidthMode] = useState(true)
  const parentRef = useRef<HTMLDivElement>(null)

  const material = useMemo(
    () => materials.find((m) => m.id === materialId),
    [materials, materialId],
  )

  const { addRecent } = useRecentlyOpened()

  useEffect(() => {
    if (!material) return
    addRecent({
      materialId: material.id,
      subjectId,
      title: material.title,
      subjectName: subject.name,
      timestamp: Date.now(),
    })
  }, [materialId])

  useEffect(() => {
    setNumPages(0)
    setPdfLoading(true)
    setPdfError(null)
    setNaturalPageWidth(null)
    setFitWidthMode(true)
    setPageNum(1)
  }, [material?.url])

  useEffect(() => {
    const el = parentRef.current
    if (!el) return
    const update = () => setContainerWidth(el.clientWidth)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const virtualizer = useVirtualizer({
    count: numPages,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 842,
    overscan: 2,
  })

  const handleScroll = () => {
    const range = virtualizer.range
    if (range) {
      setPageNum(range.startIndex + 1)
    }
  }

  const fitWidthZoom =
    naturalPageWidth && containerWidth > 0 ? (containerWidth - 64) / naturalPageWidth : null
  const MAX_ZOOM = fitWidthZoom ? Math.max(fitWidthZoom * 3, 3) : 5
  const MIN_ZOOM = 0.1
  const atMaxZoom = zoom * 1.25 >= MAX_ZOOM
  const atMinZoom = zoom / 1.25 <= MIN_ZOOM
  const zoomIn = () => {
    setFitWidthMode(false)
    setZoom((z) => (z * 1.25 >= MAX_ZOOM ? z : Math.min(z * 1.25, MAX_ZOOM)))
  }
  const zoomOut = () => {
    setFitWidthMode(false)
    setZoom((z) => (z / 1.25 <= MIN_ZOOM ? z : Math.max(z / 1.25, MIN_ZOOM)))
  }

  const fitWidth = useCallback(() => {
    if (!naturalPageWidth || containerWidth <= 0) return
    const fit = (containerWidth - 64) / naturalPageWidth
    setZoom(fit)
    setFitWidthMode(true)
  }, [naturalPageWidth, containerWidth])

  useEffect(() => {
    if (fitWidthMode && naturalPageWidth && containerWidth > 0) {
      const fit = (containerWidth - 64) / naturalPageWidth
      setZoom(fit)
    }
  }, [containerWidth, naturalPageWidth, fitWidthMode])

  useEffect(() => {
    virtualizer.measure()
  }, [zoom, naturalPageWidth, virtualizer])

  const goToPage = useCallback(
    (num: number) => {
      if (num < 1 || num > numPages) return
      virtualizer.scrollToIndex(num - 1, { align: "start" })
      setPageNum(num)
    },
    [numPages, virtualizer],
  )

  useEffect(() => {
    setPageInput(String(pageNum))
  }, [pageNum])

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInput(e.target.value)
  }

  const handlePageInputCommit = () => {
    const num = parseInt(pageInput, 10)
    if (!isNaN(num)) goToPage(num)
    else setPageInput(String(pageNum))
  }

  const handlePageInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handlePageInputCommit()
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === "ArrowUp") {
        e.preventDefault()
        parentRef.current?.scrollBy({ top: -100, behavior: "auto" })
      } else if (e.key === "ArrowDown") {
        e.preventDefault()
        parentRef.current?.scrollBy({ top: 100, behavior: "auto" })
      } else if (e.key === "PageUp") {
        e.preventDefault()
        goToPage(pageNum - 1)
      } else if (e.key === "PageDown") {
        e.preventDefault()
        goToPage(pageNum + 1)
      } else if (e.key === "Home") {
        e.preventDefault()
        goToPage(1)
      } else if (e.key === "End") {
        e.preventDefault()
        goToPage(numPages)
      } else if (e.key === "b" && material) {
        e.preventDefault()
        isBookmarked(material.id) ? removeBookmark(material.id) : addBookmark(material.id)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [pageNum, numPages, material, isBookmarked, addBookmark, removeBookmark, goToPage])

  const categoryName =
    material?.category === "theory"
      ? t("category.lectures")
      : material?.category === "problems"
        ? t("category.exercises")
        : material?.category === "exam"
          ? t("category.exams")
          : t("category.other")

  const sidebarMaterials = useMemo(() => {
    if (sidebarMode === "category" && material) {
      return materials.filter((m) => m.category === material.category)
    }
    return materials
  }, [materials, material, sidebarMode])

  const groupedByExamPart = useMemo(() => {
    const groups: Record<string, Material[]> = {}
    const noPart: Material[] = []
    sidebarMaterials.forEach((m) => {
      if (m.examPart) {
        if (!groups[m.examPart]) groups[m.examPart] = []
        groups[m.examPart].push(m)
      } else {
        noPart.push(m)
      }
    })
    const ordered: { label: string; items: Material[] }[] = []
    const partOrder = ["K1", "K2", "final"]
    partOrder.forEach((part) => {
      if (groups[part]) ordered.push({ label: part, items: groups[part] })
    })
    Object.entries(groups).forEach(([part, items]) => {
      if (!partOrder.includes(part)) ordered.push({ label: part, items })
    })
    if (noPart.length > 0) ordered.push({ label: "", items: noPart })
    return ordered
  }, [sidebarMaterials, sidebarMode])

  const groupedByCategory = useMemo(() => {
    if (sidebarMode !== "all") return null
    const groups: Record<string, Material[]> = {}
    materials.forEach((m) => {
      if (!groups[m.category]) groups[m.category] = []
      groups[m.category].push(m)
    })
    return groups
  }, [materials, sidebarMode])

  const bookmarkStar = (id: string) => {
    const b = isBookmarked(id)
    return (
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          b ? removeBookmark(id) : addBookmark(id)
        }}
        className="cursor-pointer min-w-[2.75rem] min-h-[2.75rem] flex items-center justify-center"
      >
        <Star
          className={`size-6 transition-colors duration-150 ${b ? "fill-[var(--bookmark)] text-[var(--bookmark)] animate-bookmark-pop" : "text-[var(--border-strong)] hover:text-[var(--text-hint)]"}`}
        />
      </button>
    )
  }

  if (!material) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--bg-page)] text-[var(--text-primary)]">
        {t("viewer.not_found")}
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* ── Top bar (desktop) ── */}
      <div className="hidden md:flex flex-col shrink-0 border-b bg-[var(--bg-surface)] border-[var(--border-default)]">
        <div className="flex h-9 items-center border-b border-[var(--border-faint)]">
          <button
            onClick={() => navigate({ to: "/subjects/$subjectId", params: { subjectId } })}
            className="flex cursor-pointer items-center gap-1 rounded-[0.438rem] px-2.5 py-1 text-[0.813rem] text-[var(--text-secondary)] transition-all duration-100 hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
          >
            <ArrowLeft className="size-4" />
            {t("viewer.back")}
          </button>
          <span className="mx-1.5 h-4 w-px bg-[var(--border-faint)]" />
          <div className="flex items-center gap-1.5 text-[0.75rem] text-[var(--text-hint)] min-w-0 overflow-hidden">
            <Link
              to="/subjects"
              className="shrink-0 hover:text-[var(--text-primary)] transition-colors duration-100"
            >
              {t("viewer.breadcrumb_subjects")}
            </Link>
            <span className="shrink-0">›</span>
            <Link
              to="/subjects/$subjectId"
              params={{ subjectId }}
              className="truncate hover:text-[var(--text-primary)] transition-colors duration-100"
            >
              {subject.name}
            </Link>
            <span className="shrink-0">›</span>
            <span className="shrink-0 font-medium text-[var(--text-primary)]">{categoryName}</span>
          </div>
        </div>

        <div className="flex h-10 items-center px-3">
          <div className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--text-primary)]">
            {material.title}
          </div>

          <div className="flex items-center gap-1">
            <span className="flex items-center gap-1 whitespace-nowrap px-1.5 text-[0.813rem] text-[var(--text-secondary)]">
              <input
                type="text"
                value={pageInput}
                onChange={handlePageInputChange}
                onBlur={handlePageInputCommit}
                onKeyDown={handlePageInputKeyDown}
                className="w-14 rounded border border-[var(--border-default)] px-1 py-1 text-center text-sm outline-none bg-[var(--bg-subtle)] text-[var(--text-primary)]"
              />
              <span className="text-[var(--text-hint)]">/</span>
              <span>{numPages || "?"}</span>
            </span>

            <span className="mx-1 h-5 w-px bg-[var(--border-faint)]" />

            <button
              onClick={zoomOut}
              disabled={atMinZoom}
              title={t("viewer.zoom_out")}
              className="flex size-9 items-center justify-center rounded-[0.438rem] text-[var(--text-secondary)] transition-all duration-100 hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:pointer-events-none"
            >
              <ZoomOut className="size-4" />
            </button>
            <span className="w-8 text-center text-[0.688rem] font-medium text-[var(--text-secondary)] tabular-nums">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={zoomIn}
              disabled={atMaxZoom}
              title={t("viewer.zoom_in")}
              className="flex size-9 items-center justify-center rounded-[0.438rem] text-[var(--text-secondary)] transition-all duration-100 hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:pointer-events-none"
            >
              <ZoomIn className="size-4" />
            </button>
            <button
              onClick={fitWidth}
              title={t("viewer.fit_width")}
              className="flex size-9 items-center justify-center rounded-[0.438rem] text-[var(--text-secondary)] transition-all duration-100 hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
            >
              <Maximize className="size-4" />
            </button>

            <span className="mx-1 h-5 w-px bg-[var(--border-faint)]" />

            <button
              onClick={() => setInverted((v) => !v)}
              title={t("viewer.invert")}
              className={`flex size-9 items-center justify-center rounded-[0.438rem] transition-all duration-100 ${
                inverted
                  ? "bg-[var(--accent-bg)] text-[var(--accent)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
              }`}
            >
              <SunMoon className="size-4" />
            </button>
          </div>

          <div className="flex items-center border-l border-[var(--border-faint)] ml-3 pl-3">
            {bookmarkStar(material.id)}
          </div>
        </div>
      </div>

      {/* ── Top bar (mobile) ── */}
      <div className="md:hidden flex h-[3.75rem] shrink-0 items-center border-b bg-[var(--bg-surface)] border-[var(--border-default)] px-3 gap-3">
        <button
          onClick={() => navigate({ to: "/subjects/$subjectId", params: { subjectId } })}
          className="flex shrink-0 cursor-pointer items-center justify-center size-10 rounded-[0.438rem] text-[var(--text-secondary)] transition-all duration-100 hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--text-primary)]">
          {material.title}
        </div>
        {bookmarkStar(material.id)}
      </div>

      {/* ── PDF viewer ── */}
      <div className="flex flex-1 overflow-hidden">
        <div
          ref={parentRef}
          onScroll={handleScroll}
          className="flex-1 overflow-auto md:px-8 px-0 py-6 transition-colors"
          style={{ backgroundColor: inverted ? "var(--bg-surface)" : "var(--pdf-bg)" }}
        >
          {!material.url ? (
            <div className="pt-20 text-sm text-[var(--text-secondary)]">{t("viewer.no_url")}</div>
          ) : (
            <Document
              file={material.url}
              onLoadSuccess={async (pdf) => {
                setNumPages(pdf.numPages)
                setPdfLoading(false)
                const page = await pdf.getPage(1)
                const vp = page.getViewport({ scale: 1 })
                setNaturalPageWidth(vp.width)
                if (parentRef.current) {
                  setZoom((parentRef.current.clientWidth - 64) / vp.width)
                }
              }}
              onLoadError={() => {
                const typeLabels: Record<string, string> = {
                  pdf: "PDF",
                  video: "Video",
                  image: "Slika",
                }
                setPdfError(
                  t("viewer.load_error_fmt", {
                    type: typeLabels[material?.fileType || "pdf"] || "PDF",
                  }),
                )
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
          )}
        </div>

        {/* ── Right sidebar (desktop) ── */}
        <div className="hidden md:flex w-[17.5rem] shrink-0 flex-col overflow-hidden border-l bg-[var(--bg-surface)] border-[var(--border-default)]">
          <div className="flex items-center gap-1.5 border-b border-[var(--border-faint)] px-3 py-2.5">
            <button
              onClick={() => setSidebarMode("category")}
              className={`rounded-full border px-2.5 py-1 text-[0.688rem] transition-all duration-100 ${
                sidebarMode === "category"
                  ? "border-[var(--accent)] bg-[var(--accent-bg)] text-[var(--accent-strong)] font-medium"
                  : "border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
              }`}
            >
              {categoryName}
            </button>
            <button
              onClick={() => setSidebarMode("all")}
              className={`rounded-full border px-2.5 py-1 text-[0.688rem] transition-all duration-100 ${
                sidebarMode === "all"
                  ? "border-[var(--accent)] bg-[var(--accent-bg)] text-[var(--accent-strong)] font-medium"
                  : "border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
              }`}
            >
              {t("viewer.sidebar_all")}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {sidebarMode === "category"
              ? groupedByExamPart.map((section) => (
                  <div key={section.label || "__default"}>
                    {section.label && (
                      <div className="px-2.5 pb-1 pt-2.5 text-[0.688rem] font-semibold uppercase tracking-[0.05rem] text-[var(--text-hint)]">
                        {section.label}
                      </div>
                    )}
                    {section.items.map((m) => (
                      <SidebarItem
                        key={m.id}
                        material={m}
                        isActive={m.id === materialId}
                        bookmarkStar={bookmarkStar(m.id)}
                      />
                    ))}
                  </div>
                ))
              : groupedByCategory &&
                Object.entries(groupedByCategory).map(([cat, items]) => (
                  <div key={cat}>
                    <div className="px-2.5 pb-1 pt-2.5 text-[0.688rem] font-semibold uppercase tracking-[0.05rem] text-[var(--text-hint)]">
                      {t(`category.${cat}`)}
                    </div>
                    {items.map((m) => (
                      <SidebarItem
                        key={m.id}
                        material={m}
                        isActive={m.id === materialId}
                        bookmarkStar={bookmarkStar(m.id)}
                      />
                    ))}
                  </div>
                ))}
          </div>

          <div className="flex flex-wrap gap-x-3 gap-y-1.5 border-t border-[var(--border-faint)] px-3 py-2.5 text-[0.688rem] text-[var(--text-hint)]">
            <span>
              <kbd className="rounded border border-[var(--border-strong)] bg-[var(--bg-subtle)] px-1.5 text-[0.625rem] font-medium text-[var(--text-primary)]">
                ← →
              </kbd>{" "}
              <span className="text-[var(--text-secondary)]">{t("viewer.shortcut_scroll")}</span>
            </span>
            <span>
              <kbd className="rounded border border-[var(--border-strong)] bg-[var(--bg-subtle)] px-1.5 text-[0.625rem] font-medium text-[var(--text-primary)]">
                PgUp/PgDn
              </kbd>{" "}
              <span className="text-[var(--text-secondary)]">{t("viewer.shortcut_page")}</span>
            </span>
            <span>
              <kbd className="rounded border border-[var(--border-strong)] bg-[var(--bg-subtle)] px-1.5 text-[0.625rem] font-medium text-[var(--text-primary)]">
                b
              </kbd>{" "}
              <span className="text-[var(--text-secondary)]">{t("viewer.shortcut_bookmark")}</span>
            </span>
          </div>
        </div>
      </div>

      {/* ── Bottom toolbar (mobile) ── */}
      <div className="md:hidden flex h-14 shrink-0 items-center border-t bg-[var(--bg-surface)] border-[var(--border-default)] px-2 gap-2 pb-safe">
        <button
          onClick={() => goToPage(pageNum - 1)}
          disabled={pageNum <= 1}
          className="flex items-center justify-center min-w-[2.75rem] min-h-[2.75rem] rounded-[0.438rem] text-[var(--text-secondary)] transition-all duration-100 hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:pointer-events-none"
        >
          <ChevronLeft className="size-5" />
        </button>

        <span className="flex items-center gap-1 px-2 text-[0.813rem] text-[var(--text-secondary)]">
          <input
            type="text"
            value={pageInput}
            onChange={handlePageInputChange}
            onBlur={handlePageInputCommit}
            onKeyDown={handlePageInputKeyDown}
            className="w-10 rounded border border-[var(--border-default)] px-1 py-1 text-center text-sm outline-none bg-[var(--bg-subtle)] text-[var(--text-primary)]"
          />
          <span className="text-[var(--text-hint)]">/</span>
          <span>{numPages || "?"}</span>
        </span>

        <button
          onClick={() => goToPage(pageNum + 1)}
          disabled={pageNum >= numPages}
          className="flex items-center justify-center min-w-[2.75rem] min-h-[2.75rem] rounded-[0.438rem] text-[var(--text-secondary)] transition-all duration-100 hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:pointer-events-none"
        >
          <ChevronRight className="size-5" />
        </button>

        <span className="h-6 w-px bg-[var(--border-faint)]" />

        <button
          onClick={zoomOut}
          disabled={atMinZoom}
          className="flex items-center justify-center min-w-[2.75rem] min-h-[2.75rem] rounded-[0.438rem] text-[var(--text-secondary)] transition-all duration-100 hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:pointer-events-none"
        >
          <ZoomOut className="size-5" />
        </button>
        <span className="text-[0.625rem] font-medium text-[var(--text-secondary)] tabular-nums">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={zoomIn}
          disabled={atMaxZoom}
          className="flex items-center justify-center min-w-[2.75rem] min-h-[2.75rem] rounded-[0.438rem] text-[var(--text-secondary)] transition-all duration-100 hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:pointer-events-none"
        >
          <ZoomIn className="size-5" />
        </button>

        <span className="h-6 w-px bg-[var(--border-faint)]" />

        <Sheet open={materialsSheetOpen} onOpenChange={setMaterialsSheetOpen}>
          <SheetTrigger className="flex items-center justify-center min-w-[2.75rem] min-h-[2.75rem] rounded-[0.438rem] text-[var(--text-secondary)] transition-all duration-100 hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]">
            <Layers className="size-5" />
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[70vh] flex flex-col">
            <div className="mx-auto mt-2 mb-3 h-1 w-10 shrink-0 rounded-full bg-[var(--border-strong)]" />
            <SheetHeader>
              <SheetTitle className="text-left">
                {sidebarMode === "category" ? categoryName : t("viewer.sidebar_all")}
              </SheetTitle>
            </SheetHeader>
            <div className="flex items-center gap-1.5 px-4 pb-2">
              <button
                onClick={() => setSidebarMode("category")}
                className={`rounded-full border px-2.5 py-1 text-[0.688rem] transition-all duration-100 ${
                  sidebarMode === "category"
                    ? "border-[var(--accent)] bg-[var(--accent-bg)] text-[var(--accent-strong)] font-medium"
                    : "border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
                }`}
              >
                {categoryName}
              </button>
              <button
                onClick={() => setSidebarMode("all")}
                className={`rounded-full border px-2.5 py-1 text-[0.688rem] transition-all duration-100 ${
                  sidebarMode === "all"
                    ? "border-[var(--accent)] bg-[var(--accent-bg)] text-[var(--accent-strong)] font-medium"
                    : "border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
                }`}
              >
                {t("viewer.sidebar_all")}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-2 pb-6">
              {sidebarMode === "category"
                ? groupedByExamPart.map((section) => (
                    <div key={section.label || "__default"}>
                      {section.label && (
                        <div className="px-2.5 pb-1 pt-2.5 text-[0.688rem] font-semibold uppercase tracking-[0.05rem] text-[var(--text-hint)]">
                          {section.label}
                        </div>
                      )}
                      {section.items.map((m) => (
                        <div key={m.id} onClick={() => setMaterialsSheetOpen(false)}>
                          <SidebarItem
                            material={m}
                            isActive={m.id === materialId}
                            bookmarkStar={bookmarkStar(m.id)}
                          />
                        </div>
                      ))}
                    </div>
                  ))
                : groupedByCategory &&
                  Object.entries(groupedByCategory).map(([cat, items]) => (
                    <div key={cat}>
                      <div className="px-2.5 pb-1 pt-2.5 text-[0.688rem] font-semibold uppercase tracking-[0.05rem] text-[var(--text-hint)]">
                        {t(`category.${cat}`)}
                      </div>
                      {items.map((m) => (
                        <div key={m.id} onClick={() => setMaterialsSheetOpen(false)}>
                          <SidebarItem
                            material={m}
                            isActive={m.id === materialId}
                            bookmarkStar={bookmarkStar(m.id)}
                          />
                        </div>
                      ))}
                    </div>
                  ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  )
}

function SidebarItem({
  material,
  isActive,
  bookmarkStar,
}: {
  material: Material
  isActive: boolean
  bookmarkStar: React.ReactNode
}) {
  const { t } = useI18n()
  return (
    <Link
      to="/subjects/$subjectId/materials/$materialId"
      params={{ subjectId: material.subjectId, materialId: material.id }}
      className={`flex items-start gap-2.5 rounded-[0.438rem] px-2.5 py-2 text-left transition-colors duration-100 ${isActive ? "bg-[var(--nav-active-bg)] text-[var(--nav-active-text)]" : "hover:bg-[var(--bg-subtle)]"}`}
    >
      <FileText
        className={`mt-0.5 size-6 shrink-0 ${isActive ? "text-[var(--nav-active-text)]" : "text-[var(--text-hint)]"}`}
      />
      <div className="min-w-0 flex-1">
        <div
          className={`truncate text-[0.75rem] font-medium ${isActive ? "text-[var(--nav-active-text)]" : "text-[var(--text-primary)]"}`}
        >
          {material.title}
        </div>
        <div
          className={`text-[0.688rem] ${isActive ? "text-[var(--text-hint)]" : "text-[var(--text-hint)]"}`}
        >
          {isActive ? t("viewer.current") : ""}
        </div>
      </div>
      <span onClick={(e) => e.preventDefault()} className="shrink-0">
        {bookmarkStar}
      </span>
    </Link>
  )
}
