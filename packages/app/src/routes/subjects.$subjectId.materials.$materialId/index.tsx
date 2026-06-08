import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import {
  ArrowLeft,
  ZoomIn,
  ZoomOut,
  Maximize,
  SunMoon,
  Star,
  FileText,
  FileImage,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Layers as LayersIcon,
} from "lucide-react"

import { fetchSubject } from "@/lib/api"
import { cn } from "@/lib/utils"
import { useBookmarks } from "@/hooks/useBookmarks"
import { useRecentlyOpened } from "@/hooks/useRecentlyOpened"
import { useI18n } from "@/hooks/useI18n"
import { ErrorFallback } from "@/components/ErrorFallback"
import ExpandableAssets from "@/components/ExpandableAssets"
import type { Material, MaterialAsset } from "@index/shared"
import { CATEGORY_ORDER } from "@index/shared"
import { getVirtualCategory } from "@/lib/categories"
import { useState, useRef, useEffect, useCallback } from "react"
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Document, Page, pdfjs } from "react-pdf"
import "react-pdf/dist/Page/TextLayer.css"
import "react-pdf/dist/Page/AnnotationLayer.css"
import { useVirtualizer } from "@tanstack/react-virtual"
import ImageViewer from "@/components/ImageViewer"
import VideoViewer from "@/components/VideoViewer"
import AssetGallery from "@/components/AssetGallery"
import { typeIconMap, typeTagStyles, typeBadgeStyles } from "@/lib/styles"

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"

export const Route = createFileRoute("/subjects/$subjectId/materials/$materialId/")({
  validateSearch: (search: Record<string, unknown>) => ({
    ...(typeof search.asset === "string" ? { asset: search.asset } : {}),
  }),
  loader: ({ params }) => fetchSubject(params.subjectId),
  staleTime: 30_000,
  gcTime: 60_000,
  component: ViewerPage,
  errorComponent: ErrorFallback,
})

function ViewerPage() {
  const { subject, materials } = Route.useLoaderData()
  const { subjectId, materialId } = Route.useParams()
  const navigate = useNavigate()
  const { isBookmarked, addBookmark, removeBookmark } = useBookmarks()
  const { t } = useI18n()
  const [sidebarMode, setSidebarMode] = useState<"category" | "all" | "this">("category")
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

  const { asset: assetParam } = Route.useSearch()
  const assetFromUrl = assetParam ? parseInt(assetParam, 10) || 0 : 0
  const viewerTab = assetFromUrl > 0 ? "assets" : "material"
  const assetIndex = assetFromUrl > 0 ? assetFromUrl - 1 : 0

  const material = materials.find((m) => m.id === materialId)
  const hasAssets = material && material.assets.length > 0
  const isContainer = material?.fileType === "image" && hasAssets
  const showAssetGallery = isContainer || viewerTab === "assets"

  const { addRecent } = useRecentlyOpened()

  useEffect(() => {
    if (!material) return
    addRecent({
      materialId: material.id,
      subjectId,
      title: material.title,
      subjectName: subject.name,
      fileType: material.fileType,
      category: material.category,
      examPart: material.examPart,
      solved: material.solved,
      assetCount: material.assets?.length ?? material.assetCount ?? 0,
      timestamp: Date.now(),
    })
  }, [material, materialId, subjectId, subject?.name, addRecent])

  useEffect(() => {
    setNumPages(0)
    setPdfLoading(true)
    setPdfError(null)
    setNaturalPageWidth(null)
    setFitWidthMode(true)
    setPageNum(1)
    setZoom(1)
  }, [material?.url])

  useEffect(() => {
    const el = parentRef.current
    if (!el) return
    const update = () => {
      const w = Math.round(el.clientWidth)
      setContainerWidth((prev) => (prev === w ? prev : w))
    }
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
    const items = virtualizer.getVirtualItems()
    const scrollTop = parentRef.current?.scrollTop ?? 0
    const firstVisible = items.find((item) => item.end > scrollTop) ?? items[items.length - 1]
    if (firstVisible) {
      setPageNum(firstVisible.index + 1)
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

  const fitWidth = () => {
    if (!naturalPageWidth || containerWidth <= 0) return
    const fit = (containerWidth - 64) / naturalPageWidth
    setZoom(fit)
    setFitWidthMode(true)
  }

  useEffect(() => {
    if (fitWidthMode && naturalPageWidth && containerWidth > 0) {
      const fit = (containerWidth - 64) / naturalPageWidth
      setZoom(fit)
    }
  }, [containerWidth, naturalPageWidth, fitWidthMode])

  useEffect(() => {
    virtualizer.measure()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, naturalPageWidth])

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

  const handlerRef = useRef<((e: KeyboardEvent) => void) | null>(null)
  handlerRef.current = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
    const m = materials.find((m) => m.id === materialId)
    const isPdf =
      m?.fileType === "pdf" &&
      material?.fileType !== "image" &&
      !(hasAssets && !isContainer && viewerTab === "assets")
    if (e.key === "b" && m) {
      e.preventDefault()
      if (isBookmarked(m.id)) removeBookmark(m.id)
      else addBookmark(m.id)
      return
    }
    if (!isPdf) return
    if (e.key === "ArrowUp") {
      e.preventDefault()
      parentRef.current?.scrollBy({ top: -300, behavior: "smooth" })
    } else if (e.key === "ArrowDown") {
      e.preventDefault()
      parentRef.current?.scrollBy({ top: 300, behavior: "smooth" })
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
    }
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => handlerRef.current?.(e)
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  const categoryName =
    material?.category === "theory"
      ? t("category.theory")
      : material?.category === "problems"
        ? t("category.problems")
        : material?.category === "exam"
          ? t("category.exam")
          : t("category.misc")

  const sidebarMaterials =
    sidebarMode === "this" && material
      ? [material]
      : sidebarMode === "category" && material
        ? materials.filter((m) => m.category === material.category)
        : materials

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
  const groupedByExamPart: { label: string; items: Material[] }[] = []
  const partOrder = ["K1", "K2", "final"]
  partOrder.forEach((part) => {
    if (groups[part]) {
      const label = part === "final" ? t("category.exam") : t(`category.${part.toLowerCase()}`)
      groupedByExamPart.push({ label, items: groups[part] })
    }
  })
  Object.entries(groups).forEach(([part, items]) => {
    if (!partOrder.includes(part)) groupedByExamPart.push({ label: part, items })
  })
  if (noPart.length > 0) groupedByExamPart.push({ label: "", items: noPart })

  const groupedByCategory =
    sidebarMode === "all"
      ? materials.reduce<Record<string, Material[]>>((acc, m) => {
          const vcat = getVirtualCategory(m)
          const key = CATEGORY_ORDER.includes(vcat as (typeof CATEGORY_ORDER)[number])
            ? vcat
            : "misc"
          if (!acc[key]) acc[key] = []
          acc[key].push(m)
          return acc
        }, {})
      : null

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* ── Top bar (desktop) ── */}
      <div className="hidden sm:flex h-11 items-center gap-3 shrink-0 border-b bg-[var(--bg-surface)] border-[var(--border-default)] px-3">
        <button
          onClick={() => navigate({ to: "/subjects/$subjectId", params: { subjectId } })}
          className="flex shrink-0 cursor-pointer items-center justify-center size-9 rounded-[0.438rem] text-[var(--text-secondary)] transition-all duration-100 hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="size-4" />
        </button>

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
          <span className="shrink-0 text-[var(--text-secondary)]">{categoryName}</span>
          <span className="shrink-0">›</span>
          <span className="truncate font-medium text-[var(--text-primary)]">{material?.title}</span>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-1 shrink-0">
          {material?.fileType === "pdf" && !showAssetGallery && (
            <>
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
            </>
          )}
        </div>

        <span className="h-5 w-px bg-[var(--border-faint)]" />

        {material && <BookmarkButton id={material.id} />}
      </div>

      {/* ── Top bar (mobile) ── */}
      <div className="sm:hidden flex h-[3.75rem] shrink-0 items-center border-b bg-[var(--bg-surface)] border-[var(--border-default)] px-3 gap-3">
        <button
          onClick={() => navigate({ to: "/subjects/$subjectId", params: { subjectId } })}
          className="flex shrink-0 cursor-pointer items-center justify-center size-10 rounded-[0.438rem] text-[var(--text-secondary)] transition-all duration-100 hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--text-primary)]">
          {material?.title}
        </div>
        {material && <BookmarkButton id={material.id} />}
      </div>

      {/* ── Main content area ── */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Tab bar for materials with both primary file and assets */}
          {hasAssets && !isContainer && (
            <div className="flex shrink-0 items-center gap-1 border-b border-[var(--border-default)] bg-[var(--bg-surface)] px-3">
              <button
                onClick={() => navigate({ to: ".", search: {}, replace: true })}
                className={`px-3 py-2 text-[0.75rem] font-medium border-b-2 transition-colors ${
                  viewerTab === "material"
                    ? "border-[var(--accent)] text-[var(--accent-strong)]"
                    : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {t("viewer.tab_material")}
              </button>
              <button
                onClick={() => navigate({ to: ".", search: { asset: "1" }, replace: true })}
                className={`px-3 py-2 text-[0.75rem] font-medium border-b-2 transition-colors ${
                  viewerTab === "assets"
                    ? "border-[var(--accent)] text-[var(--accent-strong)]"
                    : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {t("viewer.tab_assets")} ({material!.assets.length})
              </button>
            </div>
          )}

          {!material ? (
            <div className="flex-1 flex items-center justify-center pt-20 text-sm text-[var(--text-secondary)]">
              {t("viewer.not_found")}
            </div>
          ) : showAssetGallery && material ? (
            <AssetGallery
              assets={
                isContainer
                  ? [
                      {
                        id: material.id,
                        materialId: material.id,
                        pageNumber: 0,
                        name: material.title,
                        fileType: material.fileType,
                        url: material.url,
                      } as MaterialAsset,
                      ...material.assets,
                    ]
                  : material.assets
              }
              initialIndex={isContainer ? assetFromUrl : assetIndex}
              onIndexChange={(i) => {
                if (isContainer) {
                  navigate({ to: ".", search: i > 0 ? { asset: String(i) } : {}, replace: true })
                } else {
                  navigate({ to: ".", search: { asset: String(i + 1) }, replace: true })
                }
              }}
            />
          ) : material!.fileType === "image" ? (
            <ImageViewer url={material.url} />
          ) : material.fileType === "video" ? (
            <VideoViewer url={material.url} />
          ) : !material.url ? (
            <div className="flex-1 flex items-center justify-center pt-20 text-sm text-[var(--text-secondary)]">
              {t("viewer.no_url")}
            </div>
          ) : (
            <div
              ref={parentRef}
              onScroll={handleScroll}
              className={cn(
                "flex-1 overflow-auto md:px-8 px-0 py-6 transition-colors",
                inverted ? "bg-bg-surface" : "bg-pdf-bg",
              )}
            >
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
                  setPdfError(
                    t("viewer.load_error_fmt", {
                      type: t(`materialType.${material?.fileType || "pdf"}`) || "PDF",
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
            </div>
          )}
        </div>

        {/* ── Right sidebar (desktop) ── */}
        <div className="hidden sm:flex w-[17.5rem] shrink-0 flex-col overflow-hidden border-l bg-[var(--bg-surface)] border-[var(--border-default)]">
          <div className="flex items-center gap-1.5 border-b border-[var(--border-faint)] px-3 py-2.5">
            {hasAssets && (
              <button
                onClick={() => setSidebarMode("this")}
                className={`rounded-full border px-2.5 py-1 text-[0.688rem] transition-all duration-100 cursor-pointer ${
                  sidebarMode === "this"
                    ? "border-[var(--accent)] bg-[var(--accent-bg)] text-[var(--accent-strong)] font-medium"
                    : "border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
                }`}
              >
                {t("viewer.sidebar_this")}
              </button>
            )}
            <button
              onClick={() => setSidebarMode("category")}
              className={`rounded-full border px-2.5 py-1 text-[0.688rem] transition-all duration-100 cursor-pointer ${
                sidebarMode === "category"
                  ? "border-[var(--accent)] bg-[var(--accent-bg)] text-[var(--accent-strong)] font-medium"
                  : "border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
              }`}
            >
              {categoryName}
            </button>
            <button
              onClick={() => setSidebarMode("all")}
              className={`rounded-full border px-2.5 py-1 text-[0.688rem] transition-all duration-100 cursor-pointer ${
                sidebarMode === "all"
                  ? "border-[var(--accent)] bg-[var(--accent-bg)] text-[var(--accent-strong)] font-medium"
                  : "border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
              }`}
            >
              {t("viewer.sidebar_all")}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {sidebarMode === "this"
              ? sidebarMaterials.map((m) => (
                  <div key={m.id}>
                    <SidebarItem material={m} isActive={m.id === materialId} />
                    {m.assets.length > 0 && (
                      <div className="flex flex-col gap-0.5 pb-1">
                        {m.assets.map((a, i) => {
                          const AssetIcon = typeIconMap[a.fileType] || FileImage
                          const ts = typeTagStyles[a.fileType]
                          const isCurrentAsset = m.id === materialId && assetFromUrl === i + 1
                          return (
                            <Link
                              key={a.id}
                              to="/subjects/$subjectId/materials/$materialId"
                              params={{ subjectId, materialId }}
                              search={{ asset: String(i + 1) }}
                              className={`flex items-center gap-2 rounded-[0.438rem] px-2.5 py-1.5 transition-colors duration-100 hover:bg-[var(--bg-subtle)] ${isCurrentAsset ? "bg-[var(--nav-active-bg)]" : ""}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div
                                className={`flex size-5 shrink-0 items-center justify-center rounded-[0.25rem] ${ts?.container || "text-[var(--text-hint)]"}`}
                              >
                                <AssetIcon
                                  className={`size-3 ${ts?.icon || "text-[var(--text-hint)]"}`}
                                />
                              </div>
                              <span
                                className={`truncate text-[0.688rem] font-medium leading-snug ${isCurrentAsset ? "text-[var(--accent-strong)]" : "text-[var(--text-primary)]"}`}
                              >
                                {a.name}
                              </span>
                              <span
                                className={`shrink-0 inline-block px-1.5 py-[0.063rem] rounded-full text-[0.563rem] font-medium leading-snug ${typeBadgeStyles[a.fileType] || "bg-[var(--bg-subtle)] text-[var(--text-secondary)]"}`}
                              >
                                {t(`materialType.${a.fileType}`) || a.fileType}
                              </span>
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ))
              : sidebarMode === "category"
                ? groupedByExamPart.map((section) => (
                    <div key={section.label || "__default"}>
                      {section.label && (
                        <div className="px-2.5 pb-1 pt-2.5 text-[0.688rem] font-semibold uppercase tracking-[0.05rem] text-[var(--text-hint)]">
                          {section.label}
                        </div>
                      )}
                      {section.items.map((m) => (
                        <div key={m.id}>
                          <SidebarItem material={m} isActive={m.id === materialId} />
                          {(m.assets?.length ?? m.assetCount ?? 0) > 0 && (
                            <ExpandableAssets
                              assets={m.assets}
                              subjectId={m.subjectId}
                              materialId={m.id}
                              assetCount={m.assets?.length ?? m.assetCount ?? 0}
                              compact
                              currentAssetIndex={m.id === materialId ? assetFromUrl : undefined}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  ))
                : groupedByCategory &&
                  CATEGORY_ORDER.filter((cat) => groupedByCategory[cat]).map((cat) => (
                    <div key={cat}>
                      <div className="px-2.5 pb-1 pt-2.5 text-[0.688rem] font-semibold uppercase tracking-[0.05rem] text-[var(--text-hint)]">
                        {cat === "final" ? t("category.exam") : t(`category.${cat}`)}
                      </div>
                      {groupedByCategory[cat].map((m) => (
                        <div key={m.id}>
                          <SidebarItem material={m} isActive={m.id === materialId} />
                          {(m.assets?.length ?? m.assetCount ?? 0) > 0 && (
                            <ExpandableAssets
                              assets={m.assets}
                              subjectId={m.subjectId}
                              materialId={m.id}
                              assetCount={m.assets?.length ?? m.assetCount ?? 0}
                              compact
                              currentAssetIndex={m.id === materialId ? assetFromUrl : undefined}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
          </div>

          <div className="flex flex-wrap gap-x-3 gap-y-1.5 border-t border-[var(--border-faint)] px-3 py-2.5 text-[0.688rem] text-[var(--text-hint)]">
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
      <div className="sm:hidden flex h-14 shrink-0 items-center border-t bg-[var(--bg-surface)] border-[var(--border-default)] px-2 gap-2 pb-safe">
        {material?.fileType === "pdf" && !showAssetGallery ? (
          <>
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
          </>
        ) : null}

        <div className="flex-1" />
        <Sheet open={materialsSheetOpen} onOpenChange={setMaterialsSheetOpen}>
          <SheetTrigger className="flex items-center justify-center min-w-[2.75rem] min-h-[2.75rem] rounded-[0.438rem] text-[var(--text-secondary)] transition-all duration-100 hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]">
            <LayersIcon className="size-5" />
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[70vh] flex flex-col">
            <div className="mx-auto mt-2 mb-3 h-1 w-10 shrink-0 rounded-full bg-[var(--border-strong)]" />
            <SheetHeader>
              <SheetTitle className="text-left">
                {sidebarMode === "category"
                  ? categoryName
                  : sidebarMode === "this"
                    ? t("viewer.sidebar_this")
                    : t("viewer.sidebar_all")}
              </SheetTitle>
            </SheetHeader>
            <div className="flex items-center gap-1.5 px-4 pb-2">
              {hasAssets && (
                <button
                  onClick={() => setSidebarMode("this")}
                  className={`rounded-full border px-2.5 py-1 text-[0.688rem] transition-all duration-100 cursor-pointer ${
                    sidebarMode === "this"
                      ? "border-[var(--accent)] bg-[var(--accent-bg)] text-[var(--accent-strong)] font-medium"
                      : "border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
                  }`}
                >
                  {t("viewer.sidebar_this")}
                </button>
              )}
              <button
                onClick={() => setSidebarMode("category")}
                className={`rounded-full border px-2.5 py-1 text-[0.688rem] transition-all duration-100 cursor-pointer ${
                  sidebarMode === "category"
                    ? "border-[var(--accent)] bg-[var(--accent-bg)] text-[var(--accent-strong)] font-medium"
                    : "border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
                }`}
              >
                {categoryName}
              </button>
              <button
                onClick={() => setSidebarMode("all")}
                className={`rounded-full border px-2.5 py-1 text-[0.688rem] transition-all duration-100 cursor-pointer ${
                  sidebarMode === "all"
                    ? "border-[var(--accent)] bg-[var(--accent-bg)] text-[var(--accent-strong)] font-medium"
                    : "border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
                }`}
              >
                {t("viewer.sidebar_all")}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-2 pb-6">
              {sidebarMode === "this"
                ? sidebarMaterials.map((m) => (
                    <div key={m.id}>
                      <div onClick={() => setMaterialsSheetOpen(false)}>
                        <SidebarItem material={m} isActive={m.id === materialId} />
                      </div>
                      {m.assets.length > 0 && (
                        <div className="flex flex-col gap-0.5 pb-1">
                          {m.assets.map((a, i) => {
                            const AssetIcon = typeIconMap[a.fileType] || FileImage
                            const ts = typeTagStyles[a.fileType]
                            const isCurrentAsset = m.id === materialId && assetFromUrl === i + 1
                            return (
                              <Link
                                key={a.id}
                                to="/subjects/$subjectId/materials/$materialId"
                                params={{ subjectId, materialId }}
                                search={{ asset: String(i + 1) }}
                                className={`flex items-center gap-2 rounded-[0.438rem] px-2.5 py-1.5 transition-colors duration-100 hover:bg-[var(--bg-subtle)] ${isCurrentAsset ? "bg-[var(--nav-active-bg)]" : ""}`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setMaterialsSheetOpen(false)
                                }}
                              >
                                <div
                                  className={`flex size-5 shrink-0 items-center justify-center rounded-[0.25rem] ${ts?.container || "text-[var(--text-hint)]"}`}
                                >
                                  <AssetIcon
                                    className={`size-3 ${ts?.icon || "text-[var(--text-hint)]"}`}
                                  />
                                </div>
                                <span
                                  className={`truncate text-[0.688rem] font-medium leading-snug ${isCurrentAsset ? "text-[var(--accent-strong)]" : "text-[var(--text-primary)]"}`}
                                >
                                  {a.name}
                                </span>
                                <span
                                  className={`shrink-0 inline-block px-1.5 py-[0.063rem] rounded-full text-[0.563rem] font-medium leading-snug ${typeBadgeStyles[a.fileType] || "bg-[var(--bg-subtle)] text-[var(--text-secondary)]"}`}
                                >
                                  {t(`materialType.${a.fileType}`) || a.fileType}
                                </span>
                              </Link>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  ))
                : sidebarMode === "category"
                  ? groupedByExamPart.map((section) => (
                      <div key={section.label || "__default"}>
                        {section.label && (
                          <div className="px-2.5 pb-1 pt-2.5 text-[0.688rem] font-semibold uppercase tracking-[0.05rem] text-[var(--text-hint)]">
                            {section.label}
                          </div>
                        )}
                        {section.items.map((m) => (
                          <div key={m.id}>
                            <div onClick={() => setMaterialsSheetOpen(false)}>
                              <SidebarItem material={m} isActive={m.id === materialId} />
                            </div>
                            {(m.assets?.length ?? m.assetCount ?? 0) > 0 && (
                              <ExpandableAssets
                                assets={m.assets}
                                subjectId={m.subjectId}
                                materialId={m.id}
                                assetCount={m.assets?.length ?? m.assetCount ?? 0}
                                compact
                                currentAssetIndex={m.id === materialId ? assetFromUrl : undefined}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    ))
                  : groupedByCategory &&
                    CATEGORY_ORDER.filter((cat) => groupedByCategory[cat]).map((cat) => (
                      <div key={cat}>
                        <div className="px-2.5 pb-1 pt-2.5 text-[0.688rem] font-semibold uppercase tracking-[0.05rem] text-[var(--text-hint)]">
                          {cat === "final" ? t("category.exam") : t(`category.${cat}`)}
                        </div>
                        {groupedByCategory[cat].map((m) => (
                          <div key={m.id}>
                            <div onClick={() => setMaterialsSheetOpen(false)}>
                              <SidebarItem material={m} isActive={m.id === materialId} />
                            </div>
                            {(m.assets?.length ?? m.assetCount ?? 0) > 0 && (
                              <ExpandableAssets
                                assets={m.assets}
                                subjectId={m.subjectId}
                                materialId={m.id}
                                assetCount={m.assets?.length ?? m.assetCount ?? 0}
                                compact
                                currentAssetIndex={m.id === materialId ? assetFromUrl : undefined}
                              />
                            )}
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

function BookmarkButton({ id, size = "size-6" }: { id: string; size?: string }) {
  const { isBookmarked, addBookmark, removeBookmark } = useBookmarks()
  const bookmarked = isBookmarked(id)
  return (
    <button
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        if (bookmarked) removeBookmark(id)
        else addBookmark(id)
      }}
      className="cursor-pointer min-w-[2.75rem] min-h-[2.75rem] flex items-center justify-center"
    >
      <Star
        className={`${size} transition-colors duration-150 ${bookmarked ? "fill-[var(--bookmark)] text-[var(--bookmark)] animate-bookmark-pop" : "text-[var(--text-hint)] hover:text-[var(--text-secondary)]"}`}
      />
    </button>
  )
}

function SidebarItem({ material, isActive }: { material: Material; isActive: boolean }) {
  const { t } = useI18n()
  const Icon = typeIconMap[material.fileType] || FileText
  const ts = typeTagStyles[material.fileType]
  const badge = typeBadgeStyles[material.fileType]
  return (
    <Link
      to="/subjects/$subjectId/materials/$materialId"
      params={{ subjectId: material.subjectId, materialId: material.id }}
      search={{}}
      resetScroll={false}
      className={`flex items-center gap-2 rounded-[0.438rem] px-2.5 py-1.5 text-left transition-colors duration-100 ${isActive ? "bg-[var(--nav-active-bg)] text-[var(--nav-active-text)]" : "hover:bg-[var(--bg-subtle)]"}`}
    >
      <div
        className={`flex size-6 shrink-0 items-center justify-center rounded-[0.313rem] border ${ts?.container || "border-[var(--border-default)] bg-[var(--bg-subtle)]"}`}
      >
        <Icon className={`size-3 ${ts?.icon || "text-[var(--text-hint)]"}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div
          className={`truncate text-[0.75rem] font-medium leading-snug ${isActive ? "text-[var(--nav-active-text)]" : "text-[var(--text-primary)]"}`}
        >
          {material.title}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span
            className={`inline-block px-1.5 py-[0.063rem] rounded-full text-[0.563rem] font-medium leading-snug ${badge || "bg-[var(--bg-subtle)] text-[var(--text-secondary)]"}`}
          >
            {t(`materialType.${material.fileType}`) || material.fileType}
          </span>
        </div>
      </div>
      <span onClick={(e) => e.preventDefault()} className="shrink-0">
        <BookmarkButton id={material.id} size="size-5" />
      </span>
    </Link>
  )
}
