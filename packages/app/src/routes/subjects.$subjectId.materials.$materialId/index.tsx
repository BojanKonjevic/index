import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import {
  ArrowLeft,
  ChevronUp,
  ChevronDown,
  ZoomIn,
  ZoomOut,
  Maximize,
  SunMoon,
  Fullscreen,
  Star,
  FileText,
} from "lucide-react"
import { fetchSubject } from "@/lib/api"
import { useBookmarks } from "@/hooks/useBookmarks"
import type { Material } from "@index/shared"
import { useState, useMemo } from "react"

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

  const material = useMemo(
    () => materials.find((m) => m.id === materialId),
    [materials, materialId],
  )

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

    if (sidebarMode === "all") {
      return ordered
    }

    return ordered
  }, [sidebarMaterials, sidebarMode])

  const groupedByCategory = useMemo(() => {
    if (sidebarMode !== "all") return null
    const groups: Record<string, Material[]> = {}
    materials.forEach((m) => {
      const cat = m.category
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(m)
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
          className={`size-4 ${b ? "fill-amber-400 text-amber-400" : "text-[#ddd] hover:text-[#aaa]"}`}
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
      <div className="flex h-11 shrink-0 items-center border-b bg-white">
        <div className="flex items-center gap-0 border-r border-[#f0f0f0] px-2">
          <button
            onClick={() => navigate({ to: "/subjects/$subjectId", params: { subjectId } })}
            className="flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] text-[#555] hover:bg-[#f5f5f5] hover:text-[#111]"
          >
            <ArrowLeft className="size-3.5" />
            Nazad
          </button>
        </div>

        <div className="flex items-center gap-1.5 border-r border-[#f0f0f0] px-4 text-[12.5px] text-[#aaa]">
          <Link to="/subjects" className="hover:text-[#555]">
            Predmeti
          </Link>
          <span>›</span>
          <Link to="/subjects/$subjectId" params={{ subjectId }} className="hover:text-[#555]">
            {subject.name}
          </Link>
          <span>›</span>
          <span className="text-[#333] font-medium">{categoryName}</span>
        </div>

        <div className="min-w-0 flex-1 truncate px-5 text-[13.5px] font-medium text-[#222]">
          {material.title}
        </div>

        <div className="flex items-center gap-0.5 px-3">
          <span className="flex items-center gap-1 whitespace-nowrap px-2 text-xs text-[#888]">
            <input
              type="text"
              defaultValue="1"
              className="w-9 rounded border border-[#e0e0e0] px-1 py-0.5 text-center text-xs outline-none"
            />
            <span className="text-[#aaa]">/</span>
            <span>{material.pageCount || "?"}</span>
          </span>

          <span className="mx-1 h-5 w-px bg-[#eee]" />

          <span className="flex gap-0.5">
            {[
              { icon: ChevronUp, title: "Prethodna strana" },
              { icon: ChevronDown, title: "Sledeća strana" },
            ].map(({ icon: Icon, title }) => (
              <button key={title} title={title} className="ctrl-btn">
                <Icon className="size-3.5" />
              </button>
            ))}
          </span>

          <span className="mx-1 h-5 w-px bg-[#eee]" />

          <span className="flex gap-0.5">
            {[
              { icon: ZoomOut, title: "Umanji" },
              { icon: ZoomIn, title: "Uvećaj" },
              { icon: Maximize, title: "Podesi širinu" },
            ].map(({ icon: Icon, title }) => (
              <button key={title} title={title} className="ctrl-btn">
                <Icon className="size-3.5" />
              </button>
            ))}
          </span>

          <span className="mx-1 h-5 w-px bg-[#eee]" />

          <span className="flex gap-0.5">
            {[
              { icon: SunMoon, title: "Invertuj boje" },
              { icon: Fullscreen, title: "Ceo ekran" },
            ].map(({ icon: Icon, title }) => (
              <button key={title} title={title} className="ctrl-btn">
                <Icon className="size-3.5" />
              </button>
            ))}
          </span>
        </div>

        <div className="flex items-center border-l border-[#f0f0f0] px-3">
          {bookmarkStar(material.id)}
        </div>
      </div>

      {/* ── Main viewer ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* PDF area */}
        <div className="flex flex-1 flex-col items-center gap-4 overflow-y-auto bg-[#2c2c2c] px-8 py-6">
          <div className="flex h-[600px] w-[700px] items-center justify-center rounded bg-white shadow-lg">
            <p className="text-sm text-muted-foreground">PDF pregledač (dodaje se u fazi 5.1)</p>
          </div>
          <div className="flex h-[600px] w-[700px] items-center justify-center rounded bg-white shadow-lg opacity-70">
            <p className="text-sm text-muted-foreground">Stranica 2</p>
          </div>
        </div>

        {/* ── Right sidebar ── */}
        <div className="flex w-[264px] shrink-0 flex-col overflow-hidden border-l bg-white">
          <div className="flex items-center justify-between border-b border-[#f0f0f0] px-4 py-3.5">
            {sidebarMode === "category" ? (
              <span className="text-xs font-semibold uppercase tracking-[0.6px] text-[#888]">
                {categoryName}
              </span>
            ) : (
              <span className="text-xs font-semibold uppercase tracking-[0.6px] text-[#888]">
                Svi materijali
              </span>
            )}
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
              <kbd className="kbd-shortcut">j</kbd>
              <kbd className="kbd-shortcut">k</kbd> strana
            </span>
            <span>
              <kbd className="kbd-shortcut">g</kbd>
              <kbd className="kbd-shortcut">G</kbd> prva/zadnja
            </span>
            <span>
              <kbd className="kbd-shortcut">b</kbd> obeleži
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
      className={`flex items-start gap-2.5 rounded-md px-2.5 py-2 text-left ${
        isActive ? "bg-[#111] text-white" : "hover:bg-[#f5f5f5]"
      }`}
    >
      <FileText className={`mt-0.5 size-3.5 shrink-0 ${isActive ? "text-white" : "text-[#888]"}`} />
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
