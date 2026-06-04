import { createFileRoute, Link } from "@tanstack/react-router"
import { Search, Star, BookOpen, Pencil, FileText, Folder } from "lucide-react"
import { fetchSubject } from "@/lib/api"
import { useBookmarks } from "@/hooks/useBookmarks"
import { useFuseSearch } from "@/hooks/useFuseSearch"
import { useDebounce } from "@/hooks/useDebounce"
import { formatDate, daysUntil } from "@/lib/utils"
import type { Material } from "@index/shared"
import { useState, useMemo } from "react"

const categoryConfig: Record<string, { label: string; icon: typeof BookOpen }> = {
  theory: { label: "Teorija", icon: BookOpen },
  problems: { label: "Zadaci", icon: Pencil },
  exam: { label: "Ispiti", icon: FileText },
  misc: { label: "Ostalo", icon: Folder },
}

const categoryOrder = ["theory", "problems", "exam", "misc"]

const typeBadgeStyles: Record<string, string> = {
  pdf: "bg-amber-50 text-amber-600",
  video: "bg-blue-50 text-blue-600",
}

const categoryBadgeStyles: Record<string, string> = {
  theory: "bg-indigo-50 text-indigo-600",
  problems: "bg-green-50 text-green-600",
  exam: "bg-red-50 text-red-600",
  misc: "bg-purple-50 text-purple-600",
}

export const Route = createFileRoute("/subjects/$subjectId/")({
  loader: ({ params }) => fetchSubject(params.subjectId),
  component: SubjectPage,
})

function MaterialRow({ material }: { material: Material }) {
  const { isBookmarked, addBookmark, removeBookmark } = useBookmarks()
  const [bookmarked, setBookmarked] = useState(isBookmarked(material.id))

  return (
    <Link
      to="/subjects/$subjectId/materials/$materialId"
      params={{ subjectId: material.subjectId, materialId: material.id }}
      className="flex items-center gap-3 rounded-md border border-[#ebebeb] bg-white px-3.5 py-2.5 transition-all hover:border-[#d4d4d4] hover:shadow-sm"
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-[#e4e4e4] bg-[#f8f8f8]">
        <FileText className="size-4" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-[13.5px] font-medium">{material.title}</div>
        <div className="mt-0.5 flex flex-wrap gap-1.5">
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${typeBadgeStyles[material.fileType] || ""}`}
          >
            {material.fileType === "pdf" ? "PDF" : "Video"}
          </span>
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${categoryBadgeStyles[material.category] || ""}`}
          >
            {categoryConfig[material.category]?.label || material.category}
          </span>
          {material.examPart && (
            <span className="rounded bg-[#f5f5f5] px-1.5 py-0.5 text-[10px] text-[#888]">
              {material.examPart}
            </span>
          )}
          {material.solved === true && (
            <span className="rounded bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-600">
              rešeni
            </span>
          )}
          {material.solved === false && (
            <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600">
              nerešeni
            </span>
          )}
        </div>
      </div>

      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (bookmarked) {
            removeBookmark(material.id)
          } else {
            addBookmark(material.id)
          }
          setBookmarked(!bookmarked)
        }}
        className="shrink-0 cursor-pointer p-1"
      >
        <Star
          className={`size-4 ${
            bookmarked ? "fill-amber-400 text-amber-400" : "text-[#ddd] hover:text-[#999]"
          }`}
        />
      </button>
    </Link>
  )
}

function SubjectPage() {
  const { subject, materials, exams } = Route.useLoaderData()
  const { isBookmarked, addBookmark, removeBookmark } = useBookmarks()

  const [fileTypeFilter, setFileTypeFilter] = useState<string>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [examStatusFilter, setExamStatusFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")

  const debouncedQuery = useDebounce(searchQuery, 200)

  const fuseFiltered = useFuseSearch(materials, { keys: ["title"], threshold: 0.4 }, debouncedQuery)

  const filteredMaterials = useMemo(() => {
    return fuseFiltered.filter((m) => {
      if (fileTypeFilter !== "all" && m.fileType !== fileTypeFilter) return false
      if (categoryFilter !== "all" && m.category !== categoryFilter) return false
      if (examStatusFilter !== "all") {
        if (m.category !== "exam") return false
        if (examStatusFilter === "solved" && m.solved !== true) return false
        if (examStatusFilter === "unsolved" && m.solved !== false) return false
      }
      return true
    })
  }, [fuseFiltered, fileTypeFilter, categoryFilter, examStatusFilter])

  const grouped = useMemo(() => {
    const groups: Record<string, Material[]> = {}
    for (const cat of categoryOrder) {
      groups[cat] = []
    }
    filteredMaterials.forEach((m) => {
      if (groups[m.category]) {
        groups[m.category].push(m)
      } else {
        groups.misc.push(m)
      }
    })
    return groups
  }, [filteredMaterials])

  const nearestExam = useMemo(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    return (
      exams
        .filter((e) => new Date(e.date + "T00:00:00") >= now)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0] || null
    )
  }, [exams])

  const examUrgency = nearestExam ? daysUntil(nearestExam.date) : null
  const examColor =
    examUrgency !== null
      ? examUrgency <= 14
        ? "bg-red-50 border-red-200 text-red-700"
        : examUrgency <= 30
          ? "bg-amber-50 border-amber-200 text-amber-700"
          : "bg-green-50 border-green-200 text-green-700"
      : ""

  return (
    <div>
      <div className="border-b bg-white">
        <div className="px-9 pt-6">
          <div className="mb-3.5 flex items-center gap-1.5 text-[12.5px] text-[#999]">
            <Link to="/subjects" className="hover:text-[#555]">
              Predmeti
            </Link>
            <span className="text-[11px]">›</span>
            <span className="text-[#555]">{subject.name}</span>
          </div>

          <div className="mb-4 flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{subject.name}</h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-4 text-[13px] text-[#666]">
                <span>{subject.semester}. semestar</span>
                <span className="size-[3px] rounded-full bg-[#ccc]" />
                <span>{subject.espb} ESPB</span>
                {subject.professors[0] && (
                  <>
                    <span className="size-[3px] rounded-full bg-[#ccc]" />
                    <span>{subject.professors[0]}</span>
                  </>
                )}
              </div>
            </div>
            <button
              onClick={() =>
                isBookmarked(subject.id) ? removeBookmark(subject.id) : addBookmark(subject.id)
              }
              className="flex items-center gap-1.5 rounded-md border border-[#e0e0e0] bg-white px-3.5 py-1.5 text-[13px] text-[#444] transition-colors hover:bg-[#f5f5f5]"
            >
              <Star
                className={`size-4 ${
                  isBookmarked(subject.id) ? "fill-amber-400 text-amber-400" : ""
                }`}
              />
              {isBookmarked(subject.id) ? "Obeleženo" : "Obeleži"}
            </button>
          </div>

          {nearestExam && (
            <div
              className={`mb-4 flex items-center gap-3.5 rounded-lg border px-4 py-3 ${examColor}`}
            >
              <FileText className="size-5 shrink-0" />
              <div className="flex-1">
                <div className="text-[13.5px] font-semibold">{nearestExam.title}</div>
                <div className="mt-0.5 text-xs opacity-80">
                  {formatDate(nearestExam.date)} · {nearestExam.time}
                  {nearestExam.location ? ` · ${nearestExam.location}` : ""}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[22px] font-bold">{examUrgency}</div>
                <div className="text-[11px] opacity-75">dana</div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t px-9 py-4">
          <div className="flex flex-wrap items-start gap-6">
            <div className="flex flex-col gap-1.5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.5px] text-[#999]">
                Tip fajla
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { key: "all", label: "Svi" },
                  { key: "pdf", label: "PDF" },
                  { key: "video", label: "Video" },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setFileTypeFilter(opt.key)}
                    className={`rounded-full border px-2.5 py-1 text-xs transition-all ${
                      fileTypeFilter === opt.key
                        ? "border-[#111] bg-[#111] text-white"
                        : "border-[#e0e0e0] bg-white text-[#666] hover:border-[#aaa] hover:bg-[#fafafa]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.5px] text-[#999]">
                Kategorija
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { key: "all", label: "Sve" },
                  ...categoryOrder.map((c) => ({ key: c, label: categoryConfig[c].label })),
                ].map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => {
                      setCategoryFilter(opt.key)
                      setExamStatusFilter("all")
                    }}
                    className={`rounded-full border px-2.5 py-1 text-xs transition-all ${
                      categoryFilter === opt.key
                        ? "border-[#111] bg-[#111] text-white"
                        : "border-[#e0e0e0] bg-white text-[#666] hover:border-[#aaa] hover:bg-[#fafafa]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.5px] text-[#999]">
                Ispiti
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { key: "all", label: "Svi" },
                  { key: "solved", label: "Rešeni" },
                  { key: "unsolved", label: "Nerešeni" },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setExamStatusFilter(opt.key)}
                    className={`rounded-full border px-2.5 py-1 text-xs transition-all ${
                      examStatusFilter === opt.key
                        ? "border-[#111] bg-[#111] text-white"
                        : "border-[#e0e0e0] bg-white text-[#666] hover:border-[#aaa] hover:bg-[#fafafa]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative ml-auto min-w-[220px]">
              <Search className="absolute left-2.5 top-1/2 size-3 -translate-y-1/2 text-[#bbb]" />
              <input
                type="text"
                placeholder="Pretraži materijale…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-7 w-full rounded-md border border-[#e0e0e0] bg-white pl-7 pr-3 text-[13px] outline-none focus:border-[#999]"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-7 max-w-[1000px]">
        {filteredMaterials.length === 0 ? (
          <div className="rounded-xl border border-[#ebebeb] bg-white py-10 text-center text-[13px] text-[#aaa]">
            Nema materijala koji odgovaraju filteru 🔍
          </div>
        ) : (
          categoryOrder.map((cat) => {
            const items = grouped[cat]
            if (items.length === 0) return null

            const CatIcon = categoryConfig[cat].icon

            return (
              <section key={cat} className="mb-8">
                <div className="mb-3 flex items-baseline justify-between border-b-2 border-[#f0f0f0] pb-1.5">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#333]">
                    <CatIcon className="size-4" />
                    {categoryConfig[cat].label}
                    <span className="rounded-full bg-[#f0f0f0] px-2 py-0.5 text-[11px] font-normal text-[#999]">
                      {items.length}
                    </span>
                  </div>
                </div>

                {cat === "exam" ? (
                  <ExamCategorySection items={items} />
                ) : (
                  <div className="flex flex-col gap-1">
                    {items.map((m) => (
                      <MaterialRow key={m.id} material={m} />
                    ))}
                  </div>
                )}
              </section>
            )
          })
        )}
      </div>
    </div>
  )
}

function ExamCategorySection({ items }: { items: Material[] }) {
  const solved = items.filter((m) => m.solved === true)
  const unsolved = items.filter((m) => m.solved === false)
  const unknown = items.filter((m) => m.solved === null)

  return (
    <div>
      {solved.length > 0 && (
        <div className="ml-5 mt-3">
          <div className="mb-1.5 border-l-2 border-[#e0e0e0] py-1 pl-3 text-xs font-medium text-[#888]">
            ✓ Rešeni ({solved.length})
          </div>
          <div className="flex flex-col gap-1">
            {solved.map((m) => (
              <MaterialRow key={m.id} material={m} />
            ))}
          </div>
        </div>
      )}
      {unsolved.length > 0 && (
        <div className="ml-5 mt-3">
          <div className="mb-1.5 border-l-2 border-[#e0e0e0] py-1 pl-3 text-xs font-medium text-[#888]">
            ○ Nerešeni ({unsolved.length})
          </div>
          <div className="flex flex-col gap-1">
            {unsolved.map((m) => (
              <MaterialRow key={m.id} material={m} />
            ))}
          </div>
        </div>
      )}
      {unknown.length > 0 && (
        <div className="ml-5 mt-3">
          <div className="mb-1.5 border-l-2 border-[#e0e0e0] py-1 pl-3 text-xs font-medium text-[#888]">
            Ostali ispitni materijali ({unknown.length})
          </div>
          <div className="flex flex-col gap-1">
            {unknown.map((m) => (
              <MaterialRow key={m.id} material={m} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
