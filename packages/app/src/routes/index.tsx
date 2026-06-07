import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { Search, FileText, FileVideo, FileImage, BookOpen, Calendar, X } from "lucide-react"
import { fetchDashboard } from "@/lib/api"
import { useRecentlyOpened } from "@/hooks/useRecentlyOpened"
import { useDebounce } from "@/hooks/useDebounce"
import { useGlobalSearch } from "@/lib/search"
import { ErrorFallback } from "@/components/ErrorFallback"
import { daysUntil } from "@/lib/utils"
import { formatDate, getRelativeTime } from "@/lib/i18n"
import { useI18n } from "@/hooks/useI18n"
import type { ExamEvent } from "@index/shared"
import { getVirtualCategory } from "@/lib/categories"
import { useState, useRef, useEffect } from "react"

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
    } catch {
      return null
    }
  },
  component: HomePage,
  errorComponent: ErrorFallback,
})

function HomePage() {
  const data = Route.useLoaderData()
  const { recent } = useRecentlyOpened()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debouncedQuery = useDebounce(searchQuery, 200)
  const { t, locale } = useI18n()

  const typeIconMap: Record<string, typeof FileText> = {
    pdf: FileText,
    video: FileVideo,
    image: FileImage,
  }
  const typeTagStyles: Record<string, { container: string; icon: string }> = {
    pdf: {
      container: "border-[var(--type-pdf-text)] bg-[var(--type-pdf-bg)]",
      icon: "text-[var(--type-pdf-text)]",
    },
    video: {
      container: "border-[var(--type-video-text)] bg-[var(--type-video-bg)]",
      icon: "text-[var(--type-video-text)]",
    },
    image: {
      container: "border-[var(--type-image-text)] bg-[var(--type-image-bg)]",
      icon: "text-[var(--type-image-text)]",
    },
  }
  const typeBadgeStyles: Record<string, string> = {
    pdf: "bg-[var(--type-pdf-bg)] text-[var(--type-pdf-text)]",
    video: "bg-[var(--type-video-bg)] text-[var(--type-video-text)]",
    image: "bg-[var(--type-image-bg)] text-[var(--type-image-text)]",
  }
  const categoryBadgeStyles: Record<string, string> = {
    theory: "bg-[var(--status-info-bg)] text-[var(--status-info-text)]",
    problems: "bg-[var(--status-later-bg)] text-[var(--status-later-text)]",
    exam: "bg-[var(--status-soon-bg)] text-[var(--status-soon-text)]",
    k1: "bg-[var(--status-mid-bg)] text-[var(--status-mid-text)]",
    k2: "bg-[var(--status-mid-bg)] text-[var(--status-mid-text)]",
    final: "bg-[var(--status-soon-bg)] text-[var(--status-soon-text)]",
    misc: "bg-[var(--bg-subtle)] text-[var(--text-secondary)]",
  }

  const subjectNameMap = Object.fromEntries((data?.subjects ?? []).map((s) => [s.id, s.name]))
  const allMaterials = data?.materials ?? []
  const allExams = data?.exams ?? []

  const searchData = data
    ? {
        subjects: data.subjects,
        materials: allMaterials,
        exams: allExams,
        subjectNameMap,
        semestarLabel: t("materialType.semestar"),
      }
    : null

  const results = useGlobalSearch(searchData, debouncedQuery)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== inputRef.current) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [])

  return (
    <div className="mx-auto max-w-[35rem] md:px-6 md:pt-10 px-4 pt-5 pb-16">
      <div className="relative mb-12" ref={searchRef}>
        <div className="relative">
          <Search className="absolute left-[0.688rem] top-1/2 size-[0.938rem] -translate-y-1/2 text-[var(--text-hint)]" />
          <input
            ref={inputRef}
            type="text"
            placeholder={t("home.search_placeholder")}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setIsOpen(true)
              setSelectedIndex(0)
            }}
            onFocus={() => {
              if (searchQuery.trim()) setIsOpen(true)
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault()
                setSelectedIndex((i) => Math.min(i + 1, results.length - 1))
              } else if (e.key === "ArrowUp") {
                e.preventDefault()
                setSelectedIndex((i) => Math.max(i - 1, 0))
              } else if (e.key === "Enter" && results[selectedIndex]) {
                const r = results[selectedIndex]
                navigate({ to: r.to, params: r.params })
                setIsOpen(false)
                setSearchQuery("")
              } else if (e.key === "Escape") {
                setIsOpen(false)
                inputRef.current?.blur()
              }
            }}
            className="h-[2.75rem] w-full rounded-[0.563rem] pl-[2.25rem] pr-10 text-[0.813rem] text-[var(--text-primary)] bg-[var(--bg-subtle)] border-[0.094rem] border-[var(--border-default)] outline-none transition-all duration-100 placeholder:text-[var(--text-hint)] shadow-sm focus:shadow-md focus:border-[var(--accent)] focus:bg-[var(--bg-surface)]"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("")
                inputRef.current?.focus()
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-[var(--text-hint)] hover:text-[var(--text-primary)] transition-colors"
            >
              <X className="size-[0.938rem]" />
            </button>
          )}
        </div>

        {isOpen && results.length > 0 && (
          <div className="absolute left-0 right-0 top-[3rem] z-50 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] py-1 dropdown-enter max-h-[60vh] overflow-y-auto">
            {results.map((r, i) => (
              <button
                key={r.id}
                onClick={() => {
                  navigate({ to: r.to, params: r.params })
                  setIsOpen(false)
                  setSearchQuery("")
                }}
                onMouseEnter={() => setSelectedIndex(i)}
                className={`flex w-full items-center gap-3 px-3 py-2 text-left text-[0.813rem] transition-colors ${
                  i === selectedIndex ? "bg-[var(--bg-subtle)]" : ""
                }`}
              >
                <div className="flex size-7 shrink-0 items-center justify-center rounded bg-[var(--bg-subtle)]">
                  {r.type === "subject" ? (
                    <BookOpen className="size-3.5 text-[var(--text-secondary)]" />
                  ) : r.type === "material" ? (
                    <FileText className="size-3.5 text-[var(--text-secondary)]" />
                  ) : (
                    <Calendar className="size-3.5 text-[var(--text-secondary)]" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-[var(--text-primary)]">{r.label}</div>
                  <div className="truncate text-xs text-[var(--text-secondary)]">
                    {r.description}
                  </div>
                </div>
                <span className="shrink-0 inline-block rounded-full px-1.5 py-0.5 text-[0.625rem] font-medium bg-[var(--bg-subtle)] text-[var(--text-secondary)]">
                  {r.subtype ? t(`category.${r.subtype}`) : t(`materialType.${r.type}`) || r.type}
                </span>
              </button>
            ))}
          </div>
        )}

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
              const vcat = item.category ? getVirtualCategory(item as any) : ""
              const TypeIcon = typeIconMap[item.fileType] || FileText
              const ts = typeTagStyles[item.fileType]
              return (
                <Link
                  key={item.materialId}
                  to="/subjects/$subjectId/materials/$materialId"
                  params={{ subjectId: item.subjectId, materialId: item.materialId }}
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
                      <div className="flex flex-wrap gap-1.5">
                        {item.fileType && (
                          <span
                            className={`inline-block px-[0.438rem] py-[0.125rem] rounded-full text-[0.688rem] font-medium ${typeBadgeStyles[item.fileType] || "bg-[var(--bg-subtle)] text-[var(--text-secondary)]"}`}
                          >
                            {t(`materialType.${item.fileType}`) || item.fileType}
                          </span>
                        )}
                        {vcat && (
                          <span
                            className={`inline-block px-[0.438rem] py-[0.125rem] rounded-full text-[0.688rem] font-medium ${categoryBadgeStyles[vcat] || "bg-[var(--bg-subtle)] text-[var(--text-secondary)]"}`}
                          >
                            {vcat === "final" ? t("category.exam") : t(`category.${vcat}`)}
                          </span>
                        )}
                        {item.examPart && vcat !== item.examPart.toLowerCase() && (
                          <span className="inline-block px-[0.438rem] py-[0.125rem] rounded-full text-[0.688rem] font-medium bg-[var(--bg-subtle)] text-[var(--text-secondary)]">
                            {item.examPart}
                          </span>
                        )}
                        {item.solved === true && (
                          <span className="inline-block px-[0.438rem] py-[0.125rem] rounded-full text-[0.688rem] font-medium bg-[var(--status-later-bg)] text-[var(--status-later-text)]">
                            {t("subject.solved_badge")}
                          </span>
                        )}
                        {item.solved === false && (
                          <span className="inline-block px-[0.438rem] py-[0.125rem] rounded-full text-[0.688rem] font-medium bg-[var(--accent-bg)] text-[var(--accent-strong)]">
                            {t("subject.unsolved_badge")}
                          </span>
                        )}
                      </div>
                      <span className="ml-auto text-xs text-[var(--text-hint)]">
                        {getRelativeTime(locale, item.timestamp)}
                      </span>
                    </div>
                  </div>
                </Link>
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
