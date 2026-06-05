import { createFileRoute, Link } from "@tanstack/react-router"
import { Search, Star, LayoutGrid, List } from "lucide-react"
import { fetchSubjects } from "@/lib/api"
import { useBookmarks } from "@/hooks/useBookmarks"
import { useFuseSearch } from "@/hooks/useFuseSearch"
import { useDebounce } from "@/hooks/useDebounce"
import { useI18n } from "@/hooks/useI18n"
import type { SubjectListItem } from "@index/shared"
import { useState, useMemo } from "react"

export const Route = createFileRoute("/subjects/")({
  loader: () => fetchSubjects(),
  component: SubjectsPage,
})

function SubjectsPage() {
  const subjects = Route.useLoaderData()
  const { isBookmarked, addBookmark, removeBookmark } = useBookmarks()
  const [searchQuery, setSearchQuery] = useState("")
  const [semesterFilter, setSemesterFilter] = useState<number | null>(null)
  const [electiveOnly, setElectiveOnly] = useState(false)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const { t } = useI18n()

  const debouncedQuery = useDebounce(searchQuery, 200)

  const fuseFiltered = useFuseSearch(subjects, { keys: ["name"], threshold: 0.4 }, debouncedQuery)

  const filtered = useMemo(() => {
    return fuseFiltered.filter((s) => {
      if (semesterFilter !== null && s.semester !== semesterFilter) return false
      if (electiveOnly && !s.elective) return false
      return true
    })
  }, [fuseFiltered, semesterFilter, electiveOnly])

  const grouped = useMemo(() => {
    const groups: Record<number, SubjectListItem[]> = {}
    filtered.forEach((s) => {
      if (!groups[s.semester]) groups[s.semester] = []
      groups[s.semester].push(s)
    })
    return groups
  }, [filtered])

  const semesters = Object.keys(grouped).map(Number).sort()
  const uniqueSemesters = [...new Set(subjects.map((s) => s.semester))].sort()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">{t("subjects.title")}</h1>
        <p className="mt-0.5 text-[13px] text-[#888]">
          {subjects.length === 1
            ? t("subjects.count_fmt", { n: subjects.length })
            : t("subjects.count_plural_fmt", { n: subjects.length })}
          {" · "}
          {uniqueSemesters
            .map((s) => t("subjects.semester_label_fmt", { n: s }))
            .join(t("subjects.semesters_joiner"))}
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2.5">
        <div className="relative max-w-[300px] flex-1">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#bbb]" />
          <input
            type="text"
            placeholder={t("subjects.search_placeholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 w-full rounded-md border border-[#e0e0e0] bg-white pl-8 pr-3 text-[13px] outline-none focus:border-[#999]"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {[
            {
              label: t("subjects.all"),
              onClick: () => {
                setSemesterFilter(null)
                setElectiveOnly(false)
              },
              active: semesterFilter === null && !electiveOnly,
            },
            ...uniqueSemesters.map((s) => ({
              label: t("subjects.sem_fmt", { s }),
              onClick: () => {
                setSemesterFilter(s)
                setElectiveOnly(false)
              },
              active: semesterFilter === s && !electiveOnly,
            })),
            {
              label: t("subjects.elective"),
              onClick: () => {
                setSemesterFilter(null)
                setElectiveOnly(true)
              },
              active: electiveOnly,
            },
          ].map((chip) => (
            <button
              key={chip.label}
              onClick={chip.onClick}
              className={`rounded-full border px-3 py-1 text-[12.5px] transition-colors ${
                chip.active
                  ? "border-[#111] bg-[#111] text-white"
                  : "border-[#e0e0e0] bg-white text-[#444] hover:border-[#aaa]"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex overflow-hidden rounded-md border border-[#e0e0e0]">
          <button
            onClick={() => setViewMode("list")}
            className={`px-2.5 py-1 text-[13px] ${viewMode === "list" ? "bg-[#111] text-white" : "bg-white text-[#888]"}`}
          >
            <List className="size-3.5" />
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={`px-2.5 py-1 text-[13px] ${viewMode === "grid" ? "bg-[#111] text-white" : "bg-white text-[#888]"}`}
          >
            <LayoutGrid className="size-3.5" />
          </button>
        </div>
      </div>

      {semesters.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">{t("subjects.empty")}</p>
      ) : (
        semesters.map((sem) => (
          <section key={sem} className="mb-8">
            <div className="relative mb-3.5 flex items-center gap-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.8px] text-[#aaa]">
                {t("subjects.semester_label_fmt", { n: sem })}
              </span>
              <span className="h-px flex-1 bg-[#ebebeb]" />
            </div>

            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3"
                  : "flex flex-col gap-2"
              }
            >
              {grouped[sem].map((subject) => (
                <Link
                  key={subject.id}
                  to="/subjects/$subjectId"
                  params={{ subjectId: subject.id }}
                  className="group relative flex flex-col rounded-xl border border-[#e8e8e8] bg-white p-4 pr-5 transition-all hover:border-[#ccc] hover:shadow-sm"
                >
                  {subject.elective && (
                    <span className="absolute right-0 top-0 rounded-bl-md rounded-tr-xl bg-[#eff6ff] px-2 py-0.5 text-[10px] font-semibold tracking-[0.3px] text-[#3b82f6]">
                      {t("subjects.elective_badge")}
                    </span>
                  )}

                  <div className="mb-2.5 flex items-start justify-between">
                    <div className="flex gap-1.5">
                      <span className="rounded bg-[#f0f0f0] px-1.5 py-0.5 text-[11px] font-semibold text-[#666]">
                        {subject.semester}. sem
                      </span>
                      <span className="rounded border border-[#e8e8e8] bg-[#f8f8f8] px-1.5 py-0.5 text-[11px] text-[#888]">
                        {subject.espb} ESPB
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        isBookmarked(subject.id)
                          ? removeBookmark(subject.id)
                          : addBookmark(subject.id)
                      }}
                      className="cursor-pointer text-sm"
                    >
                      <Star
                        className={`size-3.5 ${
                          isBookmarked(subject.id)
                            ? "fill-amber-400 text-amber-400"
                            : "text-[#ddd] hover:text-[#888]"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="mb-1 text-[15px] font-semibold tracking-tight">
                    {subject.name}
                  </div>

                  {subject.professors[0] && (
                    <div className="mb-3.5 text-[12.5px] text-[#888]">{subject.professors[0]}</div>
                  )}

                  <div className="mt-auto flex items-center justify-between border-t border-[#f5f5f5] pt-3">
                    <span className="flex items-center gap-1 text-xs text-[#999]">
                      {t("subjects.material_count_fmt", { n: subject.materialCount })}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  )
}
