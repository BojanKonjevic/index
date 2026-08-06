import { createFileRoute, Link } from "@tanstack/react-router"
import { Search, FileText } from "lucide-react"
import { fetchDashboard } from "@/lib/api"
import { useRecentlyOpened } from "@/hooks/useRecentlyOpened"
import { useAssetCache } from "@/hooks/useAssetCache"
import { useSearchPalette } from "@/hooks/useSearchPalette"
import { ErrorFallback } from "@/components/ErrorFallback"
import { MaterialBadges } from "@/components/MaterialBadges"
import ExpandableAssets from "@/components/ExpandableAssets"
import { daysUntil } from "@/lib/utils"
import { formatDate, getRelativeTime } from "@/lib/i18n"
import { useI18n } from "@/hooks/useI18n"
import type { ExamEvent, Material } from "@index/shared"
import { typeIconMap, typeTagStyles } from "@/lib/styles"

function getUrgency(
  days: number,
  t: (key: string, params?: Record<string, string | number>) => string,
) {
  if (days <= 0) return { cls: "soon" as const, label: t("home.exam_today") }
  if (days === 1) return { cls: "soon" as const, label: t("home.exam_tomorrow") }
  if (days <= 14) return { cls: "soon" as const, label: t("home.exam_days", { days }) }
  if (days <= 30) return { cls: "upcoming" as const, label: t("home.exam_days", { days }) }
  return { cls: "later" as const, label: t("home.exam_days", { days }) }
}

// eslint-disable-next-line react-refresh/only-export-components
function ExamCard({ exam, subjectName }: { exam: ExamEvent; subjectName: string }) {
  const { t, locale } = useI18n()
  const days = daysUntil(exam.date)
  const urgency = getUrgency(days, t)
  const colorMap: Record<string, { bg: string; border: string }> = {
    soon: {
      bg: "bg-[var(--status-soon-bg)] text-[var(--status-soon-text)]",
      border: "border-[var(--status-soon-text)]",
    },
    upcoming: {
      bg: "bg-[var(--status-mid-bg)] text-[var(--status-mid-text)]",
      border: "border-[var(--status-mid-text)]",
    },
    later: {
      bg: "bg-[var(--status-later-bg)] text-[var(--status-later-text)]",
      border: "border-[var(--status-later-text)]",
    },
  }

  return (
    <Link
      to="/subjects/$subjectId"
      params={{ subjectId: exam.subjectId }}
      className={`flex items-center justify-between rounded-[0.563rem] border bg-[var(--bg-surface)] border-[var(--border-default)] px-3.5 py-2.5 transition-all duration-100 hover:border-[var(--border-strong)] hover:-translate-y-0.5 ${colorMap[urgency.cls].border} border-r-2`}
    >
      <div className="flex flex-col gap-0.5">
        <span className="text-[0.813rem] font-medium leading-tight">{subjectName}</span>
        <span className="text-xs leading-relaxed text-[var(--text-secondary)]">{exam.title}</span>
      </div>
      <div className="text-right">
        <div className="text-[0.813rem] font-medium">{formatDate(locale, exam.date)}</div>
        <span
          className={`inline-block rounded-full px-1.5 py-0.5 text-[0.688rem] font-medium ${colorMap[urgency.cls].bg}`}
        >
          {urgency.label}
        </span>
      </div>
    </Link>
  )
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
  const { openPalette } = useSearchPalette()
  const { t, locale } = useI18n()
  const {
    cache: recentAssetCache,
    loading: recentLoadingAssets,
    load: handleRecentExpandAssets,
  } = useAssetCache()

  const subjectNameMap = Object.fromEntries((data?.subjects ?? []).map((s) => [s.id, s.name]))
  const allExams = data?.exams ?? []

  return (
    <div className="mx-auto max-w-[35rem] md:px-6 md:pt-10 px-4 pt-5 pb-16">
      <div className="relative mb-12">
        <button
          onClick={openPalette}
          className="flex h-[2.75rem] w-full cursor-pointer items-center gap-2 rounded-[0.563rem] border-[0.094rem] border-[var(--border-default)] bg-[var(--bg-subtle)] px-3 text-left text-[0.813rem] text-[var(--text-hint)] shadow-sm transition-all duration-100 hover:border-[var(--accent)] hover:bg-[var(--bg-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        >
          <Search className="size-[0.938rem] shrink-0" />
          <span className="flex-1 truncate">{t("home.search_placeholder")}</span>
          <kbd className="hidden rounded border border-[var(--border-faint)] px-1 font-sans text-[0.625rem] md:inline">
            ⌘K
          </kbd>
        </button>

        <p className="mt-2 text-xs text-[var(--text-hint)] hidden md:block">
          {t("home.search_hint")}
        </p>
      </div>

      <section className="mb-9">
        <div className="flex items-center gap-3 mb-3.5">
          <span className="text-[0.625rem] md:text-[0.688rem] font-semibold uppercase tracking-[0.05rem] text-[var(--text-hint)] whitespace-nowrap">
            {t("home.upcoming_exams")}
          </span>
          <span className="h-px flex-1 bg-[var(--border-faint)]" />
        </div>
        <div className="flex flex-col gap-0.5">
          {allExams.length > 0 ? (
            allExams.map((exam) => (
              <ExamCard
                key={exam.id}
                exam={exam}
                subjectName={subjectNameMap[exam.subjectId] ?? ""}
              />
            ))
          ) : (
            <p className="text-sm text-muted-foreground">{t("home.no_exams")}</p>
          )}
        </div>
      </section>

      <section>
        <div className="flex items-center gap-3 mb-3.5">
          <span className="text-[0.625rem] md:text-[0.688rem] font-semibold uppercase tracking-[0.05rem] text-[var(--text-hint)] whitespace-nowrap">
            {t("home.recently_opened")}
          </span>
          <span className="h-px flex-1 bg-[var(--border-faint)]" />
        </div>
        {recent.length > 0 ? (
          <div className="flex flex-col gap-0.5">
            {recent.map((item) => {
              const TypeIcon = typeIconMap[item.fileType] || FileText
              const ts = typeTagStyles[item.fileType]
              const assetCount = item.assetCount ?? 0
              return (
                <div key={item.materialId}>
                  <Link
                    to="/subjects/$subjectId/materials/$materialId"
                    params={{ subjectId: item.subjectId, materialId: item.materialId }}
                    search={{}}
                    className="flex items-center gap-3 rounded-[0.563rem] border border-[var(--border-default)] bg-[var(--bg-surface)] px-3.5 py-2.5 transition-all duration-100 hover:border-[var(--border-strong)] hover:-translate-y-0.5"
                  >
                    <div
                      className={`flex size-9 shrink-0 items-center justify-center rounded-[0.438rem] border ${ts?.container || "border-[var(--border-default)] bg-[var(--bg-subtle)]"}`}
                    >
                      <TypeIcon className={`size-4 ${ts?.icon || "text-[var(--text-hint)]"}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <div className="min-w-0 flex-1 truncate text-[0.813rem] font-medium leading-tight text-[var(--text-primary)]">
                          {item.title}
                        </div>
                        <div className="shrink-0 text-xs text-[var(--text-secondary)]">
                          {item.subjectName}
                        </div>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <MaterialBadges
                          material={{
                            fileType: item.fileType as Material["fileType"],
                            category: item.category as Material["category"],
                            examPart: item.examPart,
                            solved: item.solved,
                          }}
                        />
                        <span className="ml-auto text-xs text-[var(--text-hint)]">
                          {getRelativeTime(locale, item.timestamp)}
                        </span>
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
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-[0.563rem] border border-[var(--border-default)] bg-[var(--bg-surface)] py-12">
            <FileText className="size-10 text-[var(--text-hint)]" />
            <p className="text-sm text-[var(--text-secondary)]">{t("home.nothing_opened")}</p>
            <Link
              to="/subjects"
              className="rounded-[0.5rem] px-4 py-2 text-sm font-medium bg-[var(--text-primary)] text-[var(--bg-surface)] transition-all duration-100 hover:opacity-85 active:scale-[0.98]"
            >
              {t("bookmarks.browse")}
            </Link>
          </div>
        )}
      </section>
    </div>
  )
}
