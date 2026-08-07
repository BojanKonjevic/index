/* eslint-disable react-refresh/only-export-components */
const ZOOM_STEP = 1.25
const SCROLL_AMOUNT_PX = 300

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import {
  ArrowLeft,
  SunMoon,
  Layers as LayersIcon,
  ChevronUp,
  ChevronDown,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react"

import { fetchSearchPages, fetchSubject } from "@/lib/api"
import { useBookmarks } from "@/hooks/useBookmarks"
import { useRecentlyOpened } from "@/hooks/useRecentlyOpened"
import { useOfflineDownloads } from "@/hooks/useOfflineDownloads"
import { useI18n } from "@/hooks/useI18n"
import { ErrorFallback } from "@/components/ErrorFallback"
import { PdfControls } from "@/components/PdfControls"
import { SidebarContent } from "@/components/SidebarContent"
import { BookmarkButton } from "@/components/BookmarkButton"
import { getOrderedMarks, getTextLayer } from "@/lib/textLayer"
import type { Material, MaterialAsset } from "@index/shared"
import { CATEGORY_ORDER } from "@index/shared"
import { getVirtualCategory } from "@/lib/categories"
import { useState, useRef, useEffect, useCallback, lazy, Suspense } from "react"
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import VideoViewer from "@/components/VideoViewer"
import AssetGallery from "@/components/AssetGallery"

const PdfViewer = lazy(() => import("@/components/PdfViewer"))

export const Route = createFileRoute("/subjects/$subjectId/materials/$materialId/")({
  validateSearch: (search: Record<string, unknown>) => {
    const out: { asset?: string; page?: number; hl?: string } = {}
    if (typeof search.asset === "string") out.asset = search.asset
    if (typeof search.page === "string" || typeof search.page === "number") {
      const n = Number(search.page)
      if (Number.isFinite(n) && n >= 1) out.page = Math.floor(n)
    }
    if (typeof search.hl === "string" && search.hl.length > 0 && search.hl.length <= 40) {
      out.hl = search.hl
    }
    return out
  },
  loader: ({ params }) => fetchSubject(params.subjectId),
  staleTime: 30_000,
  gcTime: 60_000,
  component: ViewerPage,
  errorComponent: ErrorFallback,
})

function FindChip({
  count,
  index,
  page,
  onPrev,
  onNext,
  onClear,
}: {
  count: number
  index: number
  page: number
  onPrev: () => void
  onNext: () => void
  onClear: () => void
}) {
  const { t } = useI18n()
  return (
    <div className="flex shrink-0 items-center gap-0.5 rounded-full border border-[var(--border-default)] bg-[var(--bg-subtle)] px-2 py-1 text-[0.688rem] font-medium text-[var(--text-secondary)]">
      <span className="mr-1">{t("viewer.find_count_fmt", { index, n: count, page })}</span>
      <button
        onClick={onPrev}
        aria-label={t("viewer.find_prev")}
        className="cursor-pointer rounded p-0.5 text-[var(--text-hint)] transition-colors hover:text-[var(--text-primary)]"
      >
        <ChevronUp className="size-3.5" />
      </button>
      <button
        onClick={onNext}
        aria-label={t("viewer.find_next")}
        className="cursor-pointer rounded p-0.5 text-[var(--text-hint)] transition-colors hover:text-[var(--text-primary)]"
      >
        <ChevronDown className="size-3.5" />
      </button>
      <button
        onClick={onClear}
        aria-label={t("viewer.find_clear")}
        className="cursor-pointer rounded p-0.5 text-[var(--text-hint)] transition-colors hover:text-[var(--text-primary)]"
      >
        <X className="size-3.5" />
      </button>
    </div>
  )
}

function ViewerPage() {
  const { subject, materials } = Route.useLoaderData()
  const { subjectId, materialId } = Route.useParams()
  const navigate = useNavigate()
  const { isBookmarked, addBookmark, removeBookmark } = useBookmarks()
  const { isDownloaded } = useOfflineDownloads()
  const offline = isDownloaded(subjectId)
  const { t } = useI18n()
  const [sidebarMode, setSidebarMode] = useState<"category" | "all" | "this">("category")
  const [materialsSheetOpen, setMaterialsSheetOpen] = useState(false)

  const [pageNum, setPageNum] = useState(1)
  const [numPages, setNumPages] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [inverted, setInverted] = useState(() => localStorage.getItem("pdfInverted") === "true")

  useEffect(() => {
    localStorage.setItem("pdfInverted", String(inverted))
  }, [inverted])
  const [pdfLoading, setPdfLoading] = useState(true)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [pageInput, setPageInput] = useState("1")
  const [naturalPageWidth, setNaturalPageWidth] = useState<number | null>(null)
  const [naturalPageHeight, setNaturalPageHeight] = useState<number | null>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [fitWidthMode, setFitWidthMode] = useState(true)
  const parentRef = useRef<HTMLDivElement>(null)
  const observerSetupRef = useRef(false)
  const [cssScale, setCssScale] = useState(1)
  const transitioningRef = useRef(false)
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    const sidebarPx = 14 * parseFloat(getComputedStyle(document.documentElement).fontSize)

    const handler = (e: Event) => {
      const { collapsed } = (e as CustomEvent).detail
      if (!fitWidthMode || !naturalPageWidth) return
      const el = parentRef.current
      if (!el) return

      const currentWidth = el.clientWidth
      const targetWidth = currentWidth + (collapsed ? sidebarPx : -sidebarPx)
      const targetZoom = (targetWidth - 64) / naturalPageWidth

      setCssScale(targetZoom / zoom)

      transitioningRef.current = true
      clearTimeout(transitionTimeoutRef.current)
      transitionTimeoutRef.current = setTimeout(() => {
        transitioningRef.current = false
      }, 200)
    }

    window.addEventListener("sidebar-toggling", handler)
    return () => {
      window.removeEventListener("sidebar-toggling", handler)
      clearTimeout(transitionTimeoutRef.current)
    }
  }, [fitWidthMode, naturalPageWidth, zoom])

  const { asset: assetParam, page: pageParam, hl: hlParam } = Route.useSearch()
  const assetFromUrl = assetParam ? parseInt(assetParam, 10) || 0 : 0
  const viewerTab = assetFromUrl > 0 ? "assets" : "material"
  const assetIndex = assetFromUrl > 0 ? assetFromUrl - 1 : 0

  const hlPage = pageParam ?? 1
  const [findCount, setFindCount] = useState(0)
  const [findIndex, setFindIndex] = useState(1)
  const [matchPages, setMatchPages] = useState<Array<{ page: number; count: number }>>([])
  const [matchTotal, setMatchTotal] = useState(0)
  const findTargetRef = useRef<"start" | "end" | null>(null)

  const handleHighlightCount = useCallback((count: number) => {
    setFindCount(count)
  }, [])

  const navigateToMatchPage = useCallback(
    (page: number) => {
      navigate({
        to: ".",
        search: assetParam ? { asset: assetParam, page, hl: hlParam } : { page, hl: hlParam },
        replace: true,
      })
    },
    [navigate, assetParam, hlParam],
  )

  const stepMatch = useCallback(
    (delta: number) => {
      const idx = matchPages.findIndex((p) => p.page === hlPage)
      if (idx < 0) return
      const pageCount = matchPages[idx].count
      if (pageCount <= 0) return

      if (delta > 0 && findIndex >= pageCount) {
        const nextPage = matchPages[(idx + 1) % matchPages.length]
        if (nextPage.page !== hlPage) {
          findTargetRef.current = "start"
          navigateToMatchPage(nextPage.page)
          return
        }
      } else if (delta < 0 && findIndex <= 1) {
        const prevIdx = idx > 0 ? idx - 1 : matchPages.length - 1
        const prevPage = matchPages[prevIdx]
        if (prevPage.page !== hlPage) {
          findTargetRef.current = "end"
          navigateToMatchPage(prevPage.page)
          return
        }
      }

      const next = ((findIndex - 1 + delta + pageCount) % pageCount) + 1
      setFindIndex(next)
      const root = parentRef.current
      const layer = root ? getTextLayer(root, hlPage) : null
      const marks = layer ? getOrderedMarks(layer) : []
      marks[next - 1]?.scrollIntoView({ block: "center", behavior: "smooth" })
    },
    [findIndex, matchPages, hlPage, parentRef, navigateToMatchPage],
  )

  // Server per-page counts are the only authority over findIndex: reset to the
  // first match on a new page, or the last match when stepping backwards onto it.
  useEffect(() => {
    const target = findTargetRef.current
    findTargetRef.current = null
    if (target === "end") {
      const idx = matchPages.findIndex((p) => p.page === hlPage)
      setFindIndex(idx >= 0 ? Math.max(1, matchPages[idx].count) : 1)
    } else {
      setFindIndex(1)
    }
  }, [hlPage, matchPages])

  const matchIdx = matchPages.findIndex((p) => p.page === hlPage)
  const pageMatchesBefore =
    matchIdx > 0 ? matchPages.slice(0, matchIdx).reduce((a, p) => a + p.count, 0) : 0
  const displayIndex =
    matchIdx >= 0 && matchTotal > 0
      ? pageMatchesBefore + Math.min(findIndex, matchPages[matchIdx].count || 0)
      : findIndex
  const displayCount = matchTotal > 0 ? matchTotal : findCount

  const clearFind = useCallback(() => {
    setFindCount(0)
    setFindIndex(1)
    setMatchPages([])
    setMatchTotal(0)
    navigate({
      to: ".",
      search: assetParam ? { asset: assetParam } : {},
      replace: true,
    })
  }, [navigate, assetParam])

  const material = materials.find((m) => m.id === materialId)
  const hasAssets = !!(material && material.assets.length > 0)
  const isContainer = material?.fileType === "image" && hasAssets
  const showAssetGallery = isContainer || viewerTab === "assets"

  useEffect(() => {
    if (!hlParam || material?.fileType !== "pdf" || showAssetGallery) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setMatchPages([])
      setMatchTotal(0)
      /* eslint-enable react-hooks/set-state-in-effect */
      return
    }
    let active = true
    fetchSearchPages(materialId, hlParam)
      .then((res) => {
        if (!active) return
        setMatchPages(res.pages)
        setMatchTotal(res.total)
      })
      .catch(() => {
        if (!active) return
        setMatchPages([])
        setMatchTotal(0)
      })
    return () => {
      active = false
    }
  }, [hlParam, materialId, material?.url, material?.fileType, showAssetGallery])

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
    /* eslint-disable react-hooks/set-state-in-effect */
    setNumPages(0)
    setPdfLoading(true)
    setPdfError(null)
    setNaturalPageWidth(null)
    setNaturalPageHeight(null)
    setFitWidthMode(true)
    setPageNum(1)
    setZoom(1)
    setCssScale(1)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [material?.url])

  useEffect(() => {
    const el = parentRef.current
    if (!el || observerSetupRef.current) return
    observerSetupRef.current = true

    const update = () => {
      if (transitioningRef.current) return
      const w = Math.round(el.clientWidth)
      setContainerWidth((prev) => (prev === w ? prev : w))
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => {
      observer.disconnect()
      observerSetupRef.current = false
    }
  })

  const handlePageChange = useCallback((page: number) => {
    setPageNum(page)
  }, [])

  const measuredWidth = containerWidth || 0
  const fitWidthZoom =
    naturalPageWidth && measuredWidth > 0 ? (measuredWidth - 64) / naturalPageWidth : null
  const MAX_ZOOM = fitWidthZoom ? Math.max(fitWidthZoom * 3, 3) : 5
  const MIN_ZOOM = 0.1
  const computedZoom =
    fitWidthMode && naturalPageWidth && measuredWidth > 0
      ? (measuredWidth - 64) / naturalPageWidth
      : zoom
  const displayZoom = cssScale !== 1 ? zoom * cssScale : computedZoom
  const canvasZoom = cssScale !== 1 ? zoom : displayZoom
  const atMaxZoom = displayZoom * ZOOM_STEP >= MAX_ZOOM
  const atMinZoom = displayZoom / ZOOM_STEP <= MIN_ZOOM
  const zoomIn = () => {
    setFitWidthMode(false)
    const s = cssScale
    if (s !== 1) setCssScale(1)
    setZoom((z) => {
      const effective = s !== 1 ? z * s : z
      return effective * ZOOM_STEP >= MAX_ZOOM
        ? effective
        : Math.min(effective * ZOOM_STEP, MAX_ZOOM)
    })
  }
  const zoomOut = () => {
    setFitWidthMode(false)
    const s = cssScale
    if (s !== 1) setCssScale(1)
    setZoom((z) => {
      const effective = s !== 1 ? z * s : z
      return effective / ZOOM_STEP <= MIN_ZOOM
        ? effective
        : Math.max(effective / ZOOM_STEP, MIN_ZOOM)
    })
  }

  const fitWidth = () => {
    if (!naturalPageWidth) return
    const s = cssScale
    if (s !== 1) setCssScale(1)
    const w = parentRef.current?.clientWidth ?? containerWidth
    if (w <= 0) return
    const fit = (w - 64) / naturalPageWidth
    setZoom(fit)
    setFitWidthMode(true)
  }

  const handleUserZoom = (zoomValue: number | null, fit: boolean) => {
    if (fit) {
      fitWidth()
    } else if (zoomValue !== null) {
      setFitWidthMode(false)
      setZoom(zoomValue)
    }
  }

  const handleUserScale = (scale: number) => {
    setFitWidthMode(false)
    setCssScale(scale)
  }

  const handleUserGestureEnd = () => {
    const s = cssScale
    if (s !== 1) {
      setZoom((z) => z * s)
      setCssScale(1)
    }
  }

  const goToPage = useCallback(
    (num: number) => {
      if (num < 1 || num > numPages || naturalPageHeight === null) return
      const offset = (num - 1) * (naturalPageHeight * displayZoom + 16)
      parentRef.current?.scrollTo({ top: offset, behavior: "smooth" })
      setPageNum(num)
    },
    [numPages, naturalPageHeight, displayZoom, parentRef],
  )

  const jumpedRef = useRef<{ hl: string; page: number } | null>(null)
  useEffect(() => {
    if (!hlParam || material?.fileType !== "pdf" || naturalPageHeight === null) return
    if (jumpedRef.current?.hl === hlParam && jumpedRef.current?.page === hlPage) return
    const offset = (hlPage - 1) * (naturalPageHeight * displayZoom + 16)
    parentRef.current?.scrollTo({ top: Math.max(0, offset) })
    setPageNum(hlPage)
    jumpedRef.current = { hl: hlParam, page: hlPage }
  }, [
    hlParam,
    hlPage,
    material?.url,
    material?.fileType,
    naturalPageHeight,
    displayZoom,
    parentRef,
  ])

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
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
  useEffect(() => {
    handlerRef.current = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      )
        return
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
      if (e.key === "Enter" && hlParam) {
        e.preventDefault()
        stepMatch(e.shiftKey ? -1 : 1)
        return
      }
      if (e.key === "F3" && hlParam) {
        e.preventDefault()
        stepMatch(e.shiftKey ? -1 : 1)
        return
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        parentRef.current?.scrollBy({ top: -SCROLL_AMOUNT_PX, behavior: "smooth" })
      } else if (e.key === "ArrowDown") {
        e.preventDefault()
        parentRef.current?.scrollBy({ top: SCROLL_AMOUNT_PX, behavior: "smooth" })
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
  })

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
    <div className="flex h-screen flex-col overflow-hidden pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0">
      {/* ── Top bar (mobile): back + title + zoom ── */}
      <div className="sm:hidden flex h-11 shrink-0 items-center gap-1 border-b bg-[var(--bg-surface)] border-[var(--border-default)] px-2">
        <button
          onClick={() => navigate({ to: "/subjects/$subjectId", params: { subjectId } })}
          aria-label={t("viewer.back")}
          className="flex shrink-0 cursor-pointer items-center justify-center size-9 rounded-[0.438rem] text-[var(--text-secondary)] transition-all duration-100 hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="size-5" />
        </button>
        <span className="min-w-0 flex-1 truncate text-[0.813rem] font-medium text-[var(--text-primary)]">
          {material?.title}
        </span>
        {material?.fileType === "pdf" && !showAssetGallery && (
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              onClick={zoomOut}
              disabled={atMinZoom}
              aria-label={t("viewer.zoom_out")}
              className="flex size-9 items-center justify-center rounded-[0.438rem] text-[var(--text-secondary)] transition-all duration-100 hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:pointer-events-none"
            >
              <ZoomOut className="size-4" />
            </button>
            <span className="w-9 text-center text-[0.688rem] font-medium text-[var(--text-secondary)] tabular-nums">
              {Math.round(displayZoom * 100)}%
            </span>
            <button
              onClick={zoomIn}
              disabled={atMaxZoom}
              aria-label={t("viewer.zoom_in")}
              className="flex size-9 items-center justify-center rounded-[0.438rem] text-[var(--text-secondary)] transition-all duration-100 hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:pointer-events-none"
            >
              <ZoomIn className="size-4" />
            </button>
          </div>
        )}
      </div>

      {/* ── Top bar (desktop) ── */}
      <div className="hidden sm:flex h-11 items-center gap-3 shrink-0 border-b bg-[var(--bg-surface)] border-[var(--border-default)] px-3">
        <button
          onClick={() => navigate({ to: "/subjects/$subjectId", params: { subjectId } })}
          aria-label={t("viewer.back")}
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
              {hlParam && (
                <FindChip
                  count={displayCount}
                  index={displayIndex}
                  page={hlPage}
                  onPrev={() => stepMatch(-1)}
                  onNext={() => stepMatch(1)}
                  onClear={clearFind}
                />
              )}
              <PdfControls
                pageNum={pageNum}
                numPages={numPages}
                pageInput={pageInput}
                zoom={displayZoom}
                onPageInputChange={handlePageInputChange}
                onPageInputCommit={handlePageInputCommit}
                onPageInputKeyDown={handlePageInputKeyDown}
                onZoomIn={zoomIn}
                onZoomOut={zoomOut}
                onFitWidth={fitWidth}
                onGoToPage={goToPage}
                atMaxZoom={atMaxZoom}
                atMinZoom={atMinZoom}
              />

              <button
                onClick={() => setInverted((v) => !v)}
                aria-label={t("viewer.invert")}
                className={`flex size-9 items-center justify-center rounded-[0.438rem] transition-all duration-100 ${
                  inverted
                    ? "bg-[var(--accent-bg)] text-[var(--accent)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
                }`}
                title={t("viewer.invert")}
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
      <div className="sm:hidden shrink-0 bg-[var(--bg-surface)] pt-[env(safe-area-inset-top)]">
        <div className="flex h-[3.75rem] items-center border-b border-[var(--border-default)] px-3 gap-3">
          <button
            onClick={() => navigate({ to: "/subjects/$subjectId", params: { subjectId } })}
            aria-label={t("viewer.back")}
            className="flex shrink-0 cursor-pointer items-center justify-center size-10 rounded-[0.438rem] text-[var(--text-secondary)] transition-all duration-100 hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--text-primary)]">
            {material?.title}
          </div>
          {material && <BookmarkButton id={material.id} />}
        </div>
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
            <AssetGallery
              assets={[
                {
                  id: material.id,
                  materialId: material.id,
                  pageNumber: 1,
                  name: material.title,
                  fileType: "image",
                  url: material.url,
                },
              ]}
            />
          ) : material.fileType === "video" ? (
            <VideoViewer url={material.url} />
          ) : !material.url ? (
            <div className="flex-1 flex items-center justify-center pt-20 text-sm text-[var(--text-secondary)]">
              {t("viewer.no_url")}
            </div>
          ) : (
            <Suspense
              fallback={
                <div className="flex-1 flex items-center justify-center pt-20 text-sm text-[var(--text-secondary)]">
                  {t("viewer.loading")}
                </div>
              }
            >
              <PdfViewer
                url={material.url}
                zoom={canvasZoom}
                cssScale={cssScale}
                inverted={inverted}
                parentRef={parentRef}
                numPages={numPages}
                naturalPageHeight={naturalPageHeight}
                minZoom={MIN_ZOOM}
                maxZoom={MAX_ZOOM}
                onUserZoom={handleUserZoom}
                onUserScale={handleUserScale}
                onUserGestureEnd={handleUserGestureEnd}
                onLoadSuccess={(n, w, h) => {
                  setNumPages(n)
                  setNaturalPageWidth(w)
                  setNaturalPageHeight(h)
                  if (parentRef.current) {
                    setZoom((parentRef.current.clientWidth - 64) / w)
                  }
                }}
                onLoadError={(error) => setPdfError(error)}
                setPdfLoading={setPdfLoading}
                onPageChange={handlePageChange}
                pdfLoading={pdfLoading}
                pdfError={pdfError}
                hl={hlParam}
                hlPage={hlPage}
                onHighlightCount={handleHighlightCount}
              />
            </Suspense>
          )}
        </div>

        {/* ── Right sidebar (desktop) ── */}
        <div className="hidden sm:flex w-[17.5rem] shrink-0 flex-col overflow-hidden border-l bg-[var(--bg-surface)] border-[var(--border-default)]">
          <SidebarContent
            sidebarMode={sidebarMode}
            setSidebarMode={setSidebarMode}
            sidebarMaterials={sidebarMaterials}
            groupedByExamPart={groupedByExamPart}
            groupedByCategory={groupedByCategory}
            categoryName={categoryName}
            hasAssets={hasAssets}
            subjectId={subjectId}
            materialId={materialId}
            assetFromUrl={assetFromUrl}
            offline={offline}
          />

          <div className="flex flex-wrap gap-x-3 gap-y-1.5 border-t border-[var(--border-faint)] px-3 py-2.5 text-[0.688rem] text-[var(--text-hint)]">
            {hlParam && material?.fileType === "pdf" ? (
              <span>
                <kbd className="rounded border border-[var(--border-strong)] bg-[var(--bg-subtle)] px-1.5 text-[0.625rem] font-medium text-[var(--text-primary)]">
                  ↵
                </kbd>{" "}
                <kbd className="rounded border border-[var(--border-strong)] bg-[var(--bg-subtle)] px-1.5 text-[0.625rem] font-medium text-[var(--text-primary)]">
                  ⇧↵
                </kbd>{" "}
                <span className="text-[var(--text-secondary)]">{t("viewer.shortcut_find")}</span>
              </span>
            ) : null}
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
      <div className="sm:hidden flex h-14 shrink-0 items-center border-t bg-[var(--bg-surface)] border-[var(--border-default)] px-2 gap-1 pb-safe">
        {material?.fileType === "pdf" && !showAssetGallery ? (
          <>
            {hlParam && (
              <FindChip
                count={displayCount}
                index={displayIndex}
                page={hlPage}
                onPrev={() => stepMatch(-1)}
                onNext={() => stepMatch(1)}
                onClear={clearFind}
              />
            )}
            <PdfControls
              pageNum={pageNum}
              numPages={numPages}
              pageInput={pageInput}
              zoom={displayZoom}
              onPageInputChange={handlePageInputChange}
              onPageInputCommit={handlePageInputCommit}
              onPageInputKeyDown={handlePageInputKeyDown}
              onZoomIn={zoomIn}
              onZoomOut={zoomOut}
              onFitWidth={fitWidth}
              onGoToPage={goToPage}
              atMaxZoom={atMaxZoom}
              atMinZoom={atMinZoom}
              variant="mobile"
            />
          </>
        ) : null}

        <div className="flex-1" />
        <Sheet open={materialsSheetOpen} onOpenChange={setMaterialsSheetOpen}>
          <SheetTrigger
            aria-label={t("viewer.sidebar_all")}
            className="flex items-center justify-center min-h-[2.75rem] min-w-0 px-2 rounded-[0.438rem] text-[var(--text-secondary)] transition-all duration-100 hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
          >
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
            <SidebarContent
              sidebarMode={sidebarMode}
              setSidebarMode={setSidebarMode}
              sidebarMaterials={sidebarMaterials}
              groupedByExamPart={groupedByExamPart}
              groupedByCategory={groupedByCategory}
              categoryName={categoryName}
              hasAssets={hasAssets}
              subjectId={subjectId}
              materialId={materialId}
              assetFromUrl={assetFromUrl}
              offline={offline}
              onItemClick={() => setMaterialsSheetOpen(false)}
            />
          </SheetContent>
        </Sheet>
      </div>
    </div>
  )
}
