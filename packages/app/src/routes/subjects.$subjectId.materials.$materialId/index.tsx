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
import type { Material } from "@index/shared"
import { useState, useMemo, useRef, useEffect, useCallback } from "react"
import * as pdfjs from "pdfjs-dist"

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
  const [sidebarMode, setSidebarMode] = useState<"category" | "all">("category")

  const [pdf, setPdf] = useState<pdfjs.PDFDocumentProxy | null>(null)
  const [pageNum, setPageNum] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [inverted, setInverted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [renderError, setRenderError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const baseZoomRef = useRef(1)

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
    if (!material?.url) {
      setRenderError("URL nije postavljen.")
      setLoading(false)
      return
    }
    setLoading(true)
    setRenderError(null)
    setPdf(null)
    setPageNum(1)
    setTotalPages(0)

    pdfjs
      .getDocument({ url: material.url })
      .promise.then((doc) => {
        setPdf(doc)
        setTotalPages(doc.numPages)
        setPageNum(1)
        setLoading(false)
        setRenderError(null)
      })
      .catch(() => {
        setRenderError("Neuspešno učitavanje PDF-a.")
        setLoading(false)
      })
  }, [material?.url])

  useEffect(() => {
    if (!pdf || !containerRef.current) return

    const container = containerRef.current
    container.querySelectorAll(".pdf-page-wrapper").forEach((el) => el.remove())

    const dpr = window.devicePixelRatio || 1
    const renderScale = zoom * dpr
    const displayScale = zoom

    let cancelled = false

    ;(async () => {
      for (let num = 1; num <= pdf.numPages; num++) {
        if (cancelled) break
        const page = await pdf.getPage(num)
        if (cancelled) break
        const renderVp = page.getViewport({ scale: renderScale })
        const displayVp = page.getViewport({ scale: displayScale })

        const wrapper = document.createElement("div")
        wrapper.className = "pdf-page-wrapper"
        wrapper.dataset.pageNum = String(num)
        wrapper.style.width = `${displayVp.width}px`
        wrapper.style.maxWidth = "100%"
        wrapper.style.margin = "0 auto 16px auto"
        wrapper.style.boxShadow = "0 2px 12px rgba(0,0,0,0.4)"
        wrapper.style.position = "relative"

        const canvas = document.createElement("canvas")
        canvas.className = "pdf-page"
        canvas.dataset.pageNum = String(num)
        canvas.width = renderVp.width
        canvas.height = renderVp.height
        canvas.style.display = "block"
        canvas.style.width = "100%"
        canvas.style.height = "auto"
        canvas.style.filter = inverted ? "invert(1)" : "none"
        wrapper.appendChild(canvas)

        await page.render({ canvas, viewport: renderVp }).promise
        if (cancelled) break

        container.appendChild(wrapper)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [pdf, zoom, inverted])

  useEffect(() => {
    const container = containerRef.current
    if (!container || !pdf) return

    const onScroll = () => {
      const pages = container.querySelectorAll<HTMLCanvasElement>(".pdf-page")
      if (pages.length === 0) return
      const containerRect = container.getBoundingClientRect()
      const mid = containerRect.top + containerRect.height / 2
      let closest = 1
      let closestDist = Infinity
      pages.forEach((canvas) => {
        const num = parseInt(canvas.dataset.pageNum || "1")
        const rect = canvas.getBoundingClientRect()
        const canvasMid = rect.top + rect.height / 2
        const dist = Math.abs(canvasMid - mid)
        if (dist < closestDist) {
          closestDist = dist
          closest = num
        }
      })
      setPageNum(closest)
    }

    container.addEventListener("scroll", onScroll)
    return () => container.removeEventListener("scroll", onScroll)
  }, [pdf])

  const goToPage = useCallback(
    (num: number) => {
      if (!containerRef.current || num < 1 || num > totalPages) return
      const canvas = containerRef.current.querySelector<HTMLCanvasElement>(
        `.pdf-page[data-page-num="${num}"]`,
      )
      if (canvas) {
        canvas.scrollIntoView({ block: "start" })
      }
      setPageNum(num)
    },
    [totalPages],
  )

  const [pageInput, setPageInput] = useState("1")

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

  const maxZoom = Math.min(baseZoomRef.current * 3, 5)
  const minZoom = Math.max(baseZoomRef.current * 0.2, 0.1)
  const atMaxZoom = zoom * 1.25 >= maxZoom
  const atMinZoom = zoom / 1.25 <= minZoom
  const zoomIn = () => setZoom((z) => (z * 1.25 >= maxZoom ? z : Math.min(z * 1.25, maxZoom)))
  const zoomOut = () => setZoom((z) => (z / 1.25 <= minZoom ? z : Math.max(z * 0.75, minZoom)))

  const fitWidth = useCallback(async () => {
    if (!pdf || !containerRef.current) return
    const page = await pdf.getPage(pageNum)
    const viewport = page.getViewport({ scale: 1 })
    const containerWidth = containerRef.current.clientWidth - 64
    setZoom(Math.max(minZoom, Math.min(containerWidth / viewport.width, maxZoom)))
  }, [pdf, pageNum, minZoom, maxZoom])

  useEffect(() => {
    if (!pdf || !containerRef.current) return
    const container = containerRef.current
    ;(async () => {
      const page = await pdf.getPage(pageNum)
      const viewport = page.getViewport({ scale: 1 })
      const containerWidth = container.clientWidth - 64
      baseZoomRef.current = containerWidth / viewport.width
      const fit = baseZoomRef.current
      setZoom(Math.max(minZoom, Math.min(fit * 0.75, maxZoom)))
    })()
  }, [pdf])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === "ArrowUp") {
        e.preventDefault()
        containerRef.current?.scrollBy({ top: -100, behavior: "auto" })
      } else if (e.key === "ArrowDown") {
        e.preventDefault()
        containerRef.current?.scrollBy({ top: 100, behavior: "auto" })
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
        goToPage(totalPages)
      } else if (e.key === "b" && material) {
        e.preventDefault()
        isBookmarked(material.id) ? removeBookmark(material.id) : addBookmark(material.id)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [pageNum, totalPages, material, isBookmarked, addBookmark, removeBookmark, goToPage])

  const categoryName =
    material?.category === "theory"
      ? "Predavanja"
      : material?.category === "problems"
        ? "Vežbe"
        : material?.category === "exam"
          ? "Ispiti"
          : "Ostalo"

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
        Materijal nije pronađen.
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
            Nazad
          </button>
        </div>

        <div className="flex items-center gap-1.5 border-r border-[#f0f0f0] px-4 text-sm text-[#aaa]">
          <Link to="/subjects" className="hover:text-[#555]">
            Predmeti
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
            <span>{totalPages || material.pageCount || "?"}</span>
          </span>

          <span className="mx-1 h-7 w-px bg-[#eee]" />

          <span className="flex gap-0.5">
            <button
              onClick={zoomOut}
              disabled={atMinZoom}
              title="Umanji"
              className="flex size-12 items-center justify-center rounded-md text-[#666] hover:bg-[#f5f5f5] hover:text-[#111] disabled:opacity-30 disabled:pointer-events-none"
            >
              <ZoomOut className="size-6" />
            </button>
            <button
              onClick={zoomIn}
              disabled={atMaxZoom}
              title="Uvećaj"
              className="flex size-12 items-center justify-center rounded-md text-[#666] hover:bg-[#f5f5f5] hover:text-[#111] disabled:opacity-30 disabled:pointer-events-none"
            >
              <ZoomIn className="size-6" />
            </button>
            <button
              onClick={fitWidth}
              title="Podesi širinu"
              className="flex size-12 items-center justify-center rounded-md text-[#666] hover:bg-[#f5f5f5] hover:text-[#111]"
            >
              <Maximize className="size-6" />
            </button>
          </span>

          <span className="mx-1 h-7 w-px bg-[#eee]" />

          <span className="flex gap-0.5">
            <button
              onClick={() => setInverted((v) => !v)}
              title="Invertuj boje"
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
          ref={containerRef}
          className="flex flex-1 flex-col items-center gap-0 overflow-y-auto px-8 py-6 transition-colors"
          style={{ backgroundColor: inverted ? "#fff" : "#2c2c2c" }}
        >
          {loading && (
            <div className="flex items-center gap-2 pt-20 text-sm text-[#999]">
              <Loader2 className="size-5 animate-spin" />
              Učitavanje PDF-a…
            </div>
          )}
          {renderError && <div className="pt-20 text-sm text-[#999]">{renderError}</div>}
        </div>

        {/* ── Right sidebar ── */}
        <div className="flex w-[300px] shrink-0 flex-col overflow-hidden border-l bg-white">
          <div className="flex items-center justify-between border-b border-[#f0f0f0] px-4 py-3.5">
            <span className="text-xs font-semibold uppercase tracking-[0.6px] text-[#888]">
              {sidebarMode === "category" ? categoryName : "Svi materijali"}
            </span>
            <button
              onClick={() => setSidebarMode(sidebarMode === "category" ? "all" : "category")}
              className="cursor-pointer text-[11px] text-[#aaa] hover:text-[#555]"
            >
              {sidebarMode === "category" ? "Svi materijali" : categoryName}
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
                      {cat === "theory"
                        ? "Predavanja"
                        : cat === "problems"
                          ? "Vežbe"
                          : cat === "exam"
                            ? "Ispiti"
                            : "Ostalo"}
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
              <span className="text-[#888]">obeleži</span>
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
          {material.pageCount > 0 ? `${material.pageCount} strana` : ""}
          {isActive ? (material.pageCount > 0 ? " · trenutno" : "trenutno") : ""}
        </div>
      </div>
      <span onClick={(e) => e.preventDefault()} className="shrink-0">
        {bookmarkStar}
      </span>
    </Link>
  )
}
