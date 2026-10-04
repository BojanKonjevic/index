import { createFileRoute, Link } from "@tanstack/react-router"
import { Search, X, Download, ChevronRight } from "lucide-react"
import { fetchDashboard } from "@/lib/api"
import { useRecentlyOpened } from "@/hooks/useRecentlyOpened"
import { useAssetCache } from "@/hooks/useAssetCache"
import { useFuseSearch } from "@/hooks/useFuseSearch"
import { useDebounce } from "@/hooks/useDebounce"
import { useOfflineDownloads } from "@/hooks/useOfflineDownloads"
import { useOnlineStatus } from "@/hooks/useOnlineStatus"
import { ErrorFallback } from "@/components/ErrorFallback"
import ExpandableAssets from "@/components/ExpandableAssets"
import { OfflineBadge } from "@/components/OfflineBadge"
import { PageContainer } from "@/components/PageContainer"
import { EmptyState } from "@/components/EmptyState"
import { daysUntil } from "@/lib/utils"
import { formatDate, getRelativeTime } from "@/lib/i18n"
import { useI18n } from "@/hooks/useI18n"
import type { ExamEvent, SubjectListItem } from "@index/shared"
import { formatVisual } from "@/lib/styles"
import { subjectColor, toRoman } from "@/lib/subjectMeta"
import { useState, useRef, useEffect } from "react"

function getUrgency(
  days: number,
  t: (key: string, params?: Record<string, string | number>) => string,
) {
  if (days <= 0) return { label: t("home.exam_today") }
  if (days === 1) return { label: t("home.exam_tomorrow") }
  return { label: t("home.exam_days", { days }) }
}

// eslint-disable-next-line react-refresh/only-export-components
function ExamCard({ exam, subjectName }: { exam: ExamEvent; subjectName: string }) {
  const { t, locale } = useI18n()
  const days = daysUntil(exam.date)
  const urgency = getUrgency(days, t)
  const stamped = days <= 7

  return (
    <Link
      to="/subjects/$subjectId"
      params={{ subjectId: exam.subjectId }}
      className="flex items-center justify-between gap-3 rounded-[0.563rem] border bg-[var(--bg-surface)] border-[var(--border-default)] px-3.5 py-2.5 transition-colors duration-100 hover:border-[var(--border-strong)]"
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate font-serif text-[1rem] font-semibold leading-tight">
          {subjectName}
        </span>
        <span className="truncate font-mono text-[0.688rem] leading-relaxed text-[var(--text-secondary)]">
          {exam.title} · {formatDate(locale, exam.date)}
        </span>
      </div>
      {stamped ? (
        <span className="-rotate-2 shrink-0 rounded-[0.25rem] border-2 border-[var(--urgent)] px-1.5 py-0.5 font-mono text-[0.688rem] font-bold uppercase tracking-wide text-[var(--urgent)]">
          {urgency.label}
        </span>
      ) : (
        <span className="shrink-0 rounded-full bg-[var(--bg-subtle)] px-2 py-0.5 font-mono text-[0.688rem] text-[var(--text-secondary)]">
          {urgency.label}
        </span>
      )}
    </Link>
  )
}

function categoryLabel(
  t: (key: string) => string,
  category: string,
  examPart: string | null,
): string {
  if (category === "exam" && examPart) {
    const key = `category.${examPart.toLowerCase()}`
    const label = t(key)
    return label === key ? examPart : label
  }
  const key = `category.${category}`
  const label = t(key)
  return label === key ? category : label
}

export const Route = createFileRoute("/")({
  loader: async () => {
    try {
      return await fetchDashboard()
    } catch (e) {
      console.error("Failed to load dashboard:", e)
      return null
    }
  },
  component: HomePage,
  errorComponent: ErrorFallback,
})

// eslint-disable-next-line react-refresh/only-export-components
function HomePage() {
  const data = Route.useLoaderData()
  const { recent } = useRecentlyOpened()
  const { t, locale } = useI18n()
  const {
    cache: recentAssetCache,
    loading: recentLoadingAssets,
    load: handleRecentExpandAssets,
  } = useAssetCache()

  const subjectNameMap = Object.fromEntries((data?.subjects ?? []).map((s) => [s.id, s.name]))
  const allExams = data?.exams ?? []
  const allSubjects = data?.subjects ?? []
  const hasExams = allExams.length > 0
  const hasRecent = recent.length > 0

  const [subjectQuery, setSubjectQuery] = useState("")
  const [semesterFilter, setSemesterFilter] = useState<number | null>(null)
  const [electiveOnly, setElectiveOnly] = useState(false)
  const [downloadedOnly, setDownloadedOnly] = useState(false)
  const { isDownloaded } = useOfflineDownloads()
  const online = useOnlineStatus()

  const debouncedSubjectQuery = useDebounce(subjectQuery, 200)
  const fuseFiltered = useFuseSearch(
    allSubjects,
    { keys: ["name"], threshold: 0.4 },
    debouncedSubjectQuery,
  )

  const filtered = fuseFiltered.filter((s) => {
    if (semesterFilter !== null && s.semester !== semesterFilter) return false
    if (electiveOnly && !s.elective) return false
    if (downloadedOnly && !isDownloaded(s.id)) return false
    return true
  })

  const grouped: Record<number, SubjectListItem[]> = {}
  filtered.forEach((s) => {
    if (!grouped[s.semester]) grouped[s.semester] = []
    grouped[s.semester].push(s)
  })
  for (const semester of Object.keys(grouped)) {
    grouped[Number(semester)].sort((a, b) => a.name.localeCompare(b.name, "sr"))
  }

  const semesters = Object.keys(grouped)
    .map(Number)
    .sort((a, b) => a - b)
  const uniqueSemesters = [...new Set(allSubjects.map((s) => s.semester))].sort((a, b) => a - b)
  const isFiltering =
    subjectQuery.trim() !== "" || semesterFilter !== null || electiveOnly || downloadedOnly
  const hasChipFilters = semesterFilter !== null || electiveOnly || downloadedOnly

  const chipRowRef = useRef<HTMLDivElement>(null)
  const [canScrollChips, setCanScrollChips] = useState(false)
  useEffect(() => {
    const el = chipRowRef.current
    if (!el) return
    const update = () => setCanScrollChips(el.scrollWidth > el.clientWidth + 4)
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [uniqueSemesters.length, locale, t])

  const clearChips = () => {
    setSemesterFilter(null)
    setElectiveOnly(false)
    setDownloadedOnly(false)
  }

  const clearFilters = () => {
    clearChips()
    setSubjectQuery("")
  }

  const filterTabClass = (active: boolean) =>
    `shrink-0 cursor-pointer border-b-2 px-1 py-1 text-[0.75rem] transition-colors duration-100 ${
      active
        ? "border-[var(--accent)] font-medium text-[var(--text-primary)]"
        : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
    }`

  return (
    <PageContainer className="pt-5 pb-16 md:pt-8">
      {hasExams && (
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-3.5">
            <span className="text-[0.625rem] md:text-[0.688rem] font-semibold uppercase tracking-[0.05rem] text-[var(--text-hint)] whitespace-nowrap">
              {t("home.upcoming_exams")}
            </span>
            <span className="h-px flex-1 bg-[var(--border-faint)]" />
          </div>
          <div className="grid grid-cols-1 gap-0.5 md:grid-cols-2 md:gap-2">
            {allExams.map((exam) => (
              <ExamCard
                key={exam.id}
                exam={exam}
                subjectName={subjectNameMap[exam.subjectId] ?? ""}
              />
            ))}
          </div>
        </section>
      )}

      <div
        className={`grid grid-cols-1 gap-10 ${
          hasRecent ? "md:grid-cols-[minmax(0,1fr)_20rem] lg:grid-cols-[minmax(0,1fr)_22rem]" : ""
        }`}
      >
        <section id="subjects" className="scroll-mt-20 min-w-0">
          <div className="flex items-center gap-3 mb-3.5">
            <span className="text-[0.625rem] md:text-[0.688rem] font-semibold uppercase tracking-[0.05rem] text-[var(--text-hint)] whitespace-nowrap">
              {t("subjects.title")}
            </span>
            <span className="h-px flex-1 bg-[var(--border-faint)]" />
            <span className="shrink-0 font-mono text-xs text-[var(--text-hint)]">
              {isFiltering
                ? t("subjects.results_fmt", { n: filtered.length, total: allSubjects.length })
                : allSubjects.length === 1
                  ? t("subjects.count_fmt", { n: allSubjects.length })
                  : t("subjects.count_plural_fmt", { n: allSubjects.length })}
            </span>
          </div>

          <div className="mb-5 flex flex-col gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-[0.688rem] top-1/2 size-[0.938rem] -translate-y-1/2 text-[var(--text-hint)]" />
              <input
                type="text"
                placeholder={t("subjects.search_placeholder")}
                value={subjectQuery}
                onChange={(e) => setSubjectQuery(e.target.value)}
                className="h-[2.5rem] w-full rounded-[0.563rem] pl-[2.25rem] pr-9 text-[0.813rem] text-[var(--text-primary)] bg-[var(--bg-subtle)] border-[0.094rem] border-[var(--border-default)] outline-none transition-colors duration-100 placeholder:text-[var(--text-hint)] focus:border-[var(--accent)] focus:bg-[var(--bg-surface)]"
              />
              {subjectQuery && (
                <button
                  onClick={() => setSubjectQuery("")}
                  aria-label={t("subjects.clear")}
                  className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-[var(--text-hint)] transition-colors hover:bg-[var(--bg-inset)] hover:text-[var(--text-primary)]"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            <div
              ref={chipRowRef}
              className="flex gap-4 overflow-x-auto -mx-4 px-4 no-scrollbar"
              style={
                canScrollChips
                  ? {
                      maskImage: "linear-gradient(to right, black calc(100% - 2rem), transparent)",
                      WebkitMaskImage:
                        "linear-gradient(to right, black calc(100% - 2rem), transparent)",
                    }
                  : undefined
              }
            >
              <button
                onClick={clearChips}
                aria-pressed={!hasChipFilters}
                className={filterTabClass(!hasChipFilters)}
              >
                {t("subjects.all")}
              </button>
              {uniqueSemesters.map((s) => (
                <button
                  key={s}
                  onClick={() => setSemesterFilter(semesterFilter === s ? null : s)}
                  aria-pressed={semesterFilter === s}
                  className={filterTabClass(semesterFilter === s)}
                >
                  {t("subjects.sem_fmt", { s })}
                </button>
              ))}
              <button
                onClick={() => setElectiveOnly((v) => !v)}
                aria-pressed={electiveOnly}
                className={filterTabClass(electiveOnly)}
              >
                {t("subjects.elective")}
              </button>
              <button
                onClick={() => setDownloadedOnly((v) => !v)}
                aria-pressed={downloadedOnly}
                className={`flex shrink-0 items-center gap-1 ${filterTabClass(downloadedOnly)}`}
              >
                <Download className="size-3" />
                {t("subjects.downloaded")}
              </button>
            </div>
          </div>

          {semesters.length === 0 ? (
            <EmptyState
              message={t("subjects.empty")}
              action={
                isFiltering ? (
                  <button
                    onClick={clearFilters}
                    className="mt-1 cursor-pointer rounded-[0.5rem] px-4 py-2 text-sm font-medium bg-[var(--text-primary)] text-[var(--bg-surface)] transition-opacity hover:opacity-85"
                  >
                    {t("subjects.clear")}
                  </button>
                ) : undefined
              }
            />
          ) : (
            semesters.map((sem) => {
              const espbTotal = grouped[sem].reduce((sum, s) => sum + s.espb, 0)
              return (
                <section key={sem} className="mb-7">
                  <div className="mb-1 flex items-baseline gap-3">
                    <span className="font-serif text-[1.375rem] font-semibold whitespace-nowrap text-[var(--text-primary)]">
                      {t("subjects.semester_ledger_fmt", { r: toRoman(sem) })}
                    </span>
                    <span className="h-px flex-1 self-center bg-[var(--border-default)]" />
                    <span className="shrink-0 font-mono text-[0.688rem] text-[var(--text-hint)]">
                      {espbTotal} ESPB
                    </span>
                  </div>

                  <div className="flex flex-col divide-y divide-[var(--border-faint)]">
                    {grouped[sem].map((subject) => {
                      const downloaded = isDownloaded(subject.id)
                      const color = subjectColor(subject.id)
                      return (
                        <Link
                          key={subject.id}
                          to="/subjects/$subjectId"
                          params={{ subjectId: subject.id }}
                          className="group flex items-center gap-3 px-1 py-3 transition-colors duration-100 hover:bg-[var(--bg-surface)]"
                        >
                          <div
                            className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-[0.438rem] font-mono"
                            style={{
                              color,
                              background: `color-mix(in oklch, ${color} 12%, transparent)`,
                            }}
                          >
                            <span className="text-[1rem] font-medium leading-none">
                              {subject.espb}
                            </span>
                            <span className="mt-0.5 text-[0.563rem] leading-none opacity-70">
                              ESPB
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate font-serif text-[1.063rem] font-semibold leading-tight text-[var(--text-primary)]">
                                {subject.name}
                              </span>
                              {subject.elective && (
                                <span className="shrink-0 rounded-full bg-[var(--status-info-bg)] px-1.5 py-px text-[0.563rem] font-semibold tracking-wide text-[var(--status-info-text)]">
                                  {t("subjects.elective_badge")}
                                </span>
                              )}
                            </div>
                            <div className="mt-0.5 truncate font-mono text-[0.688rem] text-[var(--text-hint)]">
                              {subject.professors[0] && <span>{subject.professors[0]} · </span>}
                              <span>
                                {subject.materialCount} {t("subjects.materials")}
                              </span>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            {downloaded && <OfflineBadge size="xs" />}
                            {!online && !downloaded && (
                              <span className="inline-block px-1.5 py-px rounded-full text-[0.625rem] font-medium border border-dashed border-[var(--border-strong)] text-[var(--text-hint)]">
                                {t("offline.not_downloaded")}
                              </span>
                            )}
                            <ChevronRight className="size-4 text-[var(--text-hint)] transition-all duration-100 group-hover:translate-x-0.5 group-hover:text-[var(--text-primary)]" />
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </section>
              )
            })
          )}
        </section>

        {hasRecent && (
          <aside className="min-w-0 md:sticky md:top-[4.5rem] md:self-start md:max-h-[calc(100vh-5.5rem)] md:overflow-y-auto">
            <div className="flex items-center gap-3 mb-3.5">
              <span className="text-[0.625rem] md:text-[0.688rem] font-semibold uppercase tracking-[0.05rem] text-[var(--text-hint)] whitespace-nowrap">
                {t("home.recently_opened")}
              </span>
              <span className="h-px flex-1 bg-[var(--border-faint)]" />
            </div>
            <div className="flex flex-col gap-0.5">
              {recent.map((item) => {
                const { Icon: TypeIcon, tag } = formatVisual(item.fileType, item.url)
                const assetCount = item.assetCount ?? 0
                return (
                  <div key={item.materialId}>
                    <Link
                      to="/subjects/$subjectId/materials/$materialId"
                      params={{ subjectId: item.subjectId, materialId: item.materialId }}
                      search={{}}
                      className="flex items-center gap-3 rounded-[0.563rem] border border-[var(--border-default)] bg-[var(--bg-surface)] px-3.5 py-2.5 transition-colors duration-100 hover:border-[var(--border-strong)]"
                    >
                      <div
                        className={`flex size-9 shrink-0 items-center justify-center rounded-[0.438rem] border ${tag.container || "border-[var(--border-default)] bg-[var(--bg-subtle)]"}`}
                      >
                        <TypeIcon className={`size-4 ${tag.icon || "text-[var(--text-hint)]"}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-serif text-[0.938rem] font-semibold leading-tight text-[var(--text-primary)]">
                          {item.title}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <span className="truncate text-xs text-[var(--text-secondary)]">
                            {item.subjectName}
                          </span>
                          <span className="ml-auto shrink-0 font-mono text-[0.625rem] text-[var(--text-hint)]">
                            {categoryLabel(t, item.category, item.examPart)}
                          </span>
                        </div>
                        <div className="mt-0.5 text-right text-xs text-[var(--text-hint)]">
                          {getRelativeTime(locale, item.timestamp)}
                        </div>
                      </div>
                    </Link>

                    <ExpandableAssets
                      assets={recentAssetCache[item.materialId]}
                      subjectId={item.subjectId}
                      materialId={item.materialId}
                      assetCount={assetCount}
                      loading={!!recentLoadingAssets[item.materialId]}
                      onExpand={() => handleRecentExpandAssets(item.materialId)}
                    />
                  </div>
                )
              })}
            </div>
          </aside>
        )}
      </div>
    </PageContainer>
  )
}
