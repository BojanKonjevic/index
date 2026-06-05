import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { Search, FileText, BookOpen, Calendar } from "lucide-react"
import { fetchSubject } from "@/lib/api"
import { useRecentlyOpened } from "@/hooks/useRecentlyOpened"
import { useDebounce } from "@/hooks/useDebounce"
import { useGlobalSearch } from "@/lib/search"
import { daysUntil } from "@/lib/utils"
import {
  formatDate as localeFormatDate,
  getRelativeTime as localeGetRelativeTime,
  t as localeT,
} from "@/lib/i18n"
import { useI18n } from "@/hooks/useI18n"
import type { ExamEvent } from "@index/shared"
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
  const { locale } = useI18n()
  const t = (k: string, p?: Record<string, string | number>) => localeT(locale, k, p)
  const days = daysUntil(exam.date)
  const urgency = getUrgency(days, t)
  const colorMap: Record<string, string> = {
    soon: "bg-[var(--status-soon-bg)] text-[var(--status-soon-text)]",
    upcoming: "bg-[var(--status-mid-bg)] text-[var(--status-mid-text)]",
    later: "bg-[var(--status-later-bg)] text-[var(--status-later-text)]",
  }

  return (
    <Link
      to="/subjects/$subjectId"
      params={{ subjectId: exam.subjectId }}
      className="flex items-center justify-between rounded-[0.563rem] border bg-[var(--bg-surface)] border-[var(--border-default)] px-3.5 py-2.5 transition-all duration-100 hover:border-[var(--border-strong)] hover:-translate-y-[0.063rem]"
    >
      <div className="flex flex-col gap-0.5">
        <span className="text-[0.844rem] font-medium">{subjectName}</span>
        <span className="text-xs text-[var(--text-secondary)]">{exam.title}</span>
      </div>
      <div className="text-right">
        <div className="text-[0.813rem] font-medium">{localeFormatDate(locale, exam.date)}</div>
        <span
          className={`inline-block rounded-full px-1.5 py-0.5 text-[0.688rem] font-medium ${colorMap[urgency.cls]}`}
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
      return await fetchSubject("matematicka-analiza-2")
    } catch {
      return null
    }
  },
  component: HomePage,
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
  const { locale } = useI18n()
  const t = (k: string, p?: Record<string, string | number>) => localeT(locale, k, p)

  const searchData = data
    ? {
        subjects: [
          {
            id: data.subject.id,
            name: data.subject.name,
            semester: data.subject.semester,
            espb: data.subject.espb,
          },
        ],
        materials: data.materials,
        exams: data.exams,
        subjectName: data.subject.name,
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

  const exams = data?.exams ?? []

  return (
    <div className="mx-auto max-w-[35rem] px-6 pt-10 pb-16">
      <div className="relative mb-12" ref={searchRef}>
        <div className="relative">
          <Search className="absolute left-[0.688rem] top-1/2 size-[0.938rem] -translate-y-1/2 text-[var(--text-hint)]" />
          <input
            ref={inputRef}
            type="search"
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
            className="h-[2.5rem] w-full rounded-[0.563rem] pl-[2.25rem] pr-4 text-[0.844rem] text-[var(--text-primary)] bg-[var(--bg-subtle)] border-[0.094rem] border-[var(--border-default)] outline-none transition-colors duration-100 placeholder:text-[var(--text-hint)] focus:border-[var(--accent)] focus:bg-[var(--bg-surface)]"
          />
        </div>

        {isOpen && results.length > 0 && (
          <div className="absolute left-0 right-0 top-[3rem] z-50 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] py-1 dropdown-enter">
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
                <span className="shrink-0 text-[0.688rem] text-[var(--text-hint)] capitalize">
                  {r.subtype ? t(`category.${r.subtype}`) : r.type}
                </span>
              </button>
            ))}
          </div>
        )}

        <p className="mt-2 text-xs text-[var(--text-hint)]">{t("home.search_hint")}</p>
      </div>

      <section className="mb-9">
        <div className="flex items-center gap-3 mb-3.5">
          <span className="text-[0.625rem] font-semibold uppercase tracking-[0.05rem] text-[var(--text-hint)] whitespace-nowrap">
            {t("home.upcoming_exams")}
          </span>
          <span className="h-px flex-1 bg-[var(--border-faint)]" />
        </div>
        <div className="flex flex-col gap-0.5">
          {exams.length > 0 ? (
            exams.map((exam) => (
              <ExamCard key={exam.id} exam={exam} subjectName={data!.subject.name} />
            ))
          ) : (
            <p className="text-sm text-muted-foreground">{t("home.no_exams")}</p>
          )}
        </div>
      </section>

      <section>
        <div className="flex items-center gap-3 mb-3.5">
          <span className="text-[0.625rem] font-semibold uppercase tracking-[0.05rem] text-[var(--text-hint)] whitespace-nowrap">
            {t("home.recently_opened")}
          </span>
          <span className="h-px flex-1 bg-[var(--border-faint)]" />
        </div>
        {recent.length > 0 ? (
          <div className="flex flex-col gap-0.5">
            {recent.map((item) => (
              <Link
                key={item.materialId}
                to="/subjects/$subjectId/materials/$materialId"
                params={{ subjectId: item.subjectId, materialId: item.materialId }}
                className="flex items-center gap-3 rounded-[0.563rem] border border-[var(--border-default)] bg-[var(--bg-surface)] px-3.5 py-2.5 transition-all duration-100 hover:border-[var(--border-strong)] hover:-translate-y-[0.063rem]"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-[0.438rem] border border-[var(--border-default)] bg-[var(--bg-subtle)]">
                  <FileText className="size-4 text-[var(--text-hint)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[0.844rem] font-medium text-[var(--text-primary)]">
                    {item.title}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">{item.subjectName}</div>
                </div>
                <span className="shrink-0 text-xs text-[var(--text-hint)]">
                  {localeGetRelativeTime(locale, item.timestamp)}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t("home.nothing_opened")}</p>
        )}
      </section>
    </div>
  )
}
