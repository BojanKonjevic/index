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
} from "lucide-react"

import { fetchSubject } from "@/lib/api"
import { useBookmarks } from "@/hooks/useBookmarks"
import { useRecentlyOpened } from "@/hooks/useRecentlyOpened"
import { useI18n } from "@/hooks/useI18n"
import type { Material } from "@index/shared"
import { useState, useMemo, useRef, useEffect, useCallback } from "react"
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
  }, [zoom, virtualizer])

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
        className="cursor-pointer"
      >
        <Star
          className={`size-6 ${b ? "fill-amber-400 text-amber-400" : "text-[#ddd] hover:text-[#aaa]"}`}
        />
      </button>
    )
  }

  if (!material) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#1a1a1a] text-white">
        {t("viewer.not_found")}
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* ── Top bar ── */}
      <div className="flex h-20 shrink-0 items-center border-b bg-white">
        <div className="flex items-center gap-0 border-r border-[#f0f0f0] px-2">
          <button
            onClick={() => navigate({ to: "/subjects/$subjectId", params: { subjectId } })}
            className="flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-[#555] hover:bg-[#f5f5f5] hover:text-[#111]"
          >
            <ArrowLeft className="size-6" />
            {t("viewer.back")}
          </button>
        </div>

        <div className="flex items-center gap-1.5 border-r border-[#f0f0f0] px-4 text-sm text-[#aaa]">
          <Link to="/subjects" className="hover:text-[#555]">
            {t("viewer.breadcrumb_subjects")}
          </Link>
          <span>›</span>
          <Link to="/subjects/$subjectId" params={{ subjectId }} className="hover:text-[#555]">
            {subject.name}
          </Link>
          <span>›</span>
          <span className="font-medium text-[#333]">{categoryName}</span>
        </div>

        <div className="min-w-0 flex-1 truncate px-5 text-base font-medium text-[#222]">
          {material.title}
        </div>

        <div className="flex items-center gap-0.5 px-2">
          <span className="flex items-center gap-1 whitespace-nowrap px-1.5 text-[13px] text-[#888]">
            <input
              type="text"
              value={pageInput}
              onChange={handlePageInputChange}
              onBlur={handlePageInputCommit}
              onKeyDown={handlePageInputKeyDown}
              className="w-12 rounded border border-[#e0e0e0] px-1 py-1 text-center text-sm outline-none"
            />
            <span className="text-[#aaa]">/</span>
            <span>{numPages || material.pageCount || "?"}</span>
          </span>

          <span className="mx-1 h-7 w-px bg-[#eee]" />

          <span className="flex gap-0.5">
            <button
              onClick={zoomOut}
              disabled={atMinZoom}
              title={t("viewer.zoom_out")}
              className="flex size-12 items-center justify-center rounded-md text-[#666] hover:bg-[#f5f5f5] hover:text-[#111] disabled:opacity-30 disabled:pointer-events-none"
            >
              <ZoomOut className="size-6" />
            </button>
            <button
              onClick={zoomIn}
              disabled={atMaxZoom}
              title={t("viewer.zoom_in")}
              className="flex size-12 items-center justify-center rounded-md text-[#666] hover:bg-[#f5f5f5] hover:text-[#111] disabled:opacity-30 disabled:pointer-events-none"
            >
              <ZoomIn className="size-6" />
            </button>
            <button
              onClick={fitWidth}
              title={t("viewer.fit_width")}
              className="flex size-12 items-center justify-center rounded-md text-[#666] hover:bg-[#f5f5f5] hover:text-[#111]"
            >
              <Maximize className="size-6" />
            </button>
          </span>

          <span className="mx-1 h-7 w-px bg-[#eee]" />

          <span className="flex gap-0.5">
            <button
              onClick={() => setInverted((v) => !v)}
              title={t("viewer.invert")}
              className="flex size-12 items-center justify-center rounded-md text-[#666] hover:bg-[#f5f5f5] hover:text-[#111]"
            >
              <SunMoon className="size-6" />
            </button>
          </span>
        </div>

        <div className="flex items-center border-l border-[#f0f0f0] px-4">
          {bookmarkStar(material.id)}
        </div>
      </div>

      {/* ── PDF viewer ── */}
      <div className="flex flex-1 overflow-hidden">
        <div
          ref={parentRef}
          onScroll={handleScroll}
          className="flex-1 overflow-auto px-8 py-6 transition-colors"
          style={{ backgroundColor: inverted ? "#fff" : "#2c2c2c" }}
        >
          {!material.url ? (
            <div className="pt-20 text-sm text-[#999]">{t("viewer.no_url")}</div>
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
                setPdfError(t("viewer.load_error"))
                setPdfLoading(false)
              }}
              loading={null}
            >
              {pdfLoading && (
                <div className="flex items-center gap-2 pt-20 text-sm text-[#999]">
                  <Loader2 className="size-5 animate-spin" />
                  {t("viewer.loading")}
                </div>
              )}
              {pdfError && <div className="pt-20 text-sm text-[#999]">{pdfError}</div>}

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

        {/* ── Right sidebar ── */}
        <div className="flex w-[300px] shrink-0 flex-col overflow-hidden border-l bg-white">
          <div className="flex items-center justify-between border-b border-[#f0f0f0] px-4 py-3.5">
            <span className="text-xs font-semibold uppercase tracking-[0.6px] text-[#888]">
              {sidebarMode === "category" ? categoryName : t("viewer.sidebar_all")}
            </span>
            <button
              onClick={() => setSidebarMode(sidebarMode === "category" ? "all" : "category")}
              className="cursor-pointer text-[11px] text-[#aaa] hover:text-[#555]"
            >
              {sidebarMode === "category" ? t("viewer.sidebar_all") : categoryName}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {sidebarMode === "category"
              ? groupedByExamPart.map((section) => (
                  <div key={section.label || "__default"}>
                    {section.label && (
                      <div className="px-2.5 pb-1 pt-2.5 text-[10.5px] font-semibold uppercase tracking-[0.6px] text-[#ccc]">
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
                    <div className="px-2.5 pb-1 pt-2.5 text-[10.5px] font-semibold uppercase tracking-[0.6px] text-[#ccc]">
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

          <div className="flex flex-wrap gap-2 border-t border-[#f0f0f0] px-3 py-2.5 text-[11px] text-[#ccc]">
            <span>
              <kbd className="rounded border border-[#bbb] bg-[#ddd] px-1.5 text-[11px] font-medium text-[#333]">
                b
              </kbd>{" "}
              <span className="text-[#888]">{t("viewer.shortcut_bookmark")}</span>
            </span>
          </div>
        </div>
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
      className={`flex items-start gap-2.5 rounded-md px-2.5 py-2 text-left ${isActive ? "bg-[#111] text-white" : "hover:bg-[#f5f5f5]"}`}
    >
      <FileText className={`mt-0.5 size-6 shrink-0 ${isActive ? "text-white" : "text-[#888]"}`} />
      <div className="min-w-0 flex-1">
        <div className={`truncate text-[12.5px] font-medium ${isActive ? "text-white" : ""}`}>
          {material.title}
        </div>
        <div className={`text-[11px] ${isActive ? "text-[#ccc]" : "text-[#aaa]"}`}>
          {material.pageCount > 0 ? t("viewer.pages_fmt", { n: material.pageCount }) : ""}
          {isActive
            ? material.pageCount > 0
              ? ` · ${t("viewer.current")}`
              : t("viewer.current")
            : ""}
        </div>
      </div>
      <span onClick={(e) => e.preventDefault()} className="shrink-0">
        {bookmarkStar}
      </span>
    </Link>
  )
}
