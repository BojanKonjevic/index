import { createFileRoute, Link } from "@tanstack/react-router"
import { Search, LayoutGrid, List } from "lucide-react"
import { fetchSubjects } from "@/lib/api"
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
    <div className="mx-auto max-w-[56.25rem] md:p-8 p-4 md:pt-8 pt-5">
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-[-0.3px] text-[var(--text-primary)]">
          {t("subjects.title")}
        </h1>
        <p className="mt-0.5 text-[0.813rem] text-[var(--text-secondary)]">
          {subjects.length === 1
            ? t("subjects.count_fmt", { n: subjects.length })
            : t("subjects.count_plural_fmt", { n: subjects.length })}
          {" · "}
          {uniqueSemesters
            .map((s) => t("subjects.semester_label_fmt", { n: s }))
            .join(t("subjects.semesters_joiner"))}
        </p>
      </div>

      <div className="mb-6 flex flex-col gap-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-[0.688rem] top-1/2 size-[0.938rem] -translate-y-1/2 text-[var(--text-hint)]" />
          <input
            type="text"
            placeholder={t("subjects.search_placeholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-[2.5rem] w-full rounded-[0.563rem] pl-[2.25rem] pr-4 text-[0.844rem] text-[var(--text-primary)] bg-[var(--bg-subtle)] border-[0.094rem] border-[var(--border-default)] outline-none transition-colors duration-100 placeholder:text-[var(--text-hint)] focus:border-[var(--accent)] focus:bg-[var(--bg-surface)]"
          />
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex gap-1.5 overflow-x-auto -mx-4 px-4 no-scrollbar flex-1">
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
                className={`shrink-0 rounded-full border px-3 py-1 text-[0.75rem] transition-all duration-100 ${
                  chip.active
                    ? "border-[var(--accent)] bg-[var(--accent-bg)] text-[var(--accent-strong)] font-medium"
                    : "border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-subtle)]"
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          <div className="shrink-0 flex overflow-hidden rounded-md border border-[var(--border-default)] md:flex hidden">
            <button
              onClick={() => setViewMode("list")}
              className={`px-2.5 py-1 transition-colors duration-100 ${viewMode === "list" ? "bg-[var(--nav-active-bg)] text-[var(--nav-active-text)]" : "bg-[var(--bg-surface)] text-[var(--text-hint)] hover:text-[var(--text-primary)]"}`}
            >
              <List className="size-3.5" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`px-2.5 py-1 transition-colors duration-100 ${viewMode === "grid" ? "bg-[var(--nav-active-bg)] text-[var(--nav-active-text)]" : "bg-[var(--bg-surface)] text-[var(--text-hint)] hover:text-[var(--text-primary)]"}`}
            >
              <LayoutGrid className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      {semesters.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">{t("subjects.empty")}</p>
      ) : (
        semesters.map((sem) => (
          <section key={sem} className="mb-8">
            <div className="flex items-center gap-3 mb-3.5">
              <span className="text-[0.625rem] font-semibold uppercase tracking-[0.05rem] text-[var(--text-hint)] whitespace-nowrap">
                {t("subjects.semester_label_fmt", { n: sem })}
              </span>
              <span className="h-px flex-1 bg-[var(--border-faint)]" />
            </div>

            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 md:grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3"
                  : "flex flex-col gap-2"
              }
            >
              {grouped[sem].map((subject) => (
                <Link
                  key={subject.id}
                  to="/subjects/$subjectId"
                  params={{ subjectId: subject.id }}
                  className="relative flex flex-col rounded-[0.563rem] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 pr-5 transition-all duration-100 hover:border-[var(--border-strong)] hover:-translate-y-[0.063rem]"
                >
                  {subject.elective && (
                    <span className="absolute right-0 top-0 rounded-bl-md rounded-tr-xl bg-[var(--status-info-bg)] px-2 py-0.5 text-[0.625rem] font-semibold tracking-[0.019rem] text-[var(--status-info-text)]">
                      {t("subjects.elective_badge")}
                    </span>
                  )}

                  <div className="mb-2.5 flex items-start justify-between">
                    <div className="flex gap-1.5">
                      <span className="inline-block px-[0.438rem] py-[0.125rem] rounded-full text-[0.656rem] font-medium bg-[var(--bg-subtle)] text-[var(--text-secondary)]">
                        {subject.semester}. sem
                      </span>
                      <span className="inline-block px-[0.438rem] py-[0.125rem] rounded-full text-[0.656rem] font-medium bg-[var(--bg-subtle)] text-[var(--text-secondary)]">
                        {subject.espb} ESPB
                      </span>
                    </div>
                  </div>

                  <div className="mb-1 text-[0.938rem] font-semibold tracking-tight text-[var(--text-primary)]">
                    {subject.name}
                  </div>

                  {subject.professors[0] && (
                    <div className="mb-3.5 text-[0.781rem] text-[var(--text-secondary)]">
                      {subject.professors[0]}
                    </div>
                  )}

                  <div className="mt-auto flex items-center justify-between border-t border-[var(--border-faint)] pt-3">
                    <span className="flex items-center gap-1 text-xs text-[var(--text-hint)]">
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
