import { createFileRoute, Link } from "@tanstack/react-router"
import {
  Search,
  Star,
  BookOpen,
  Pencil,
  FileText,
  FileVideo,
  FileImage,
  Folder,
  ChevronDown,
  SlidersHorizontal,
} from "lucide-react"
import { fetchSubject } from "@/lib/api"
import { useBookmarks } from "@/hooks/useBookmarks"

import { daysUntil } from "@/lib/utils"
import { formatDate as localeFormatDate, t as localeT } from "@/lib/i18n"
import { useI18n } from "@/hooks/useI18n"
import { useDebounce } from "@/hooks/useDebounce"
import { useFuseSearch } from "@/hooks/useFuseSearch"
import { ErrorFallback } from "@/components/ErrorFallback"
import type { Material } from "@index/shared"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"

const categoryOrder = ["theory", "problems", "k1", "k2", "final", "misc"]

const typeBadgeStyles: Record<string, string> = {
  pdf: "bg-[var(--type-pdf-bg)] text-[var(--type-pdf-text)]",
  video: "bg-[var(--type-video-bg)] text-[var(--type-video-text)]",
  image: "bg-[var(--type-image-bg)] text-[var(--type-image-text)]",
}

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

const categoryBadgeStyles: Record<string, string> = {
  theory: "bg-[var(--status-info-bg)] text-[var(--status-info-text)]",
  problems: "bg-[var(--status-later-bg)] text-[var(--status-later-text)]",
  exam: "bg-[var(--status-soon-bg)] text-[var(--status-soon-text)]",
  k1: "bg-[var(--status-soon-bg)] text-[var(--status-soon-text)]",
  k2: "bg-[var(--status-soon-bg)] text-[var(--status-soon-text)]",
  final: "bg-[var(--status-soon-bg)] text-[var(--status-soon-text)]",
  misc: "bg-[var(--bg-subtle)] text-[var(--text-secondary)]",
}

function getVirtualCategory(m: Material): string {
  if (m.category === "exam" && m.examPart) {
    return m.examPart.toLowerCase()
  }
  return m.category
}

export const Route = createFileRoute("/subjects/$subjectId/")({
  loader: ({ params }) => fetchSubject(params.subjectId),
  component: SubjectPage,
  errorComponent: ErrorFallback,
})

function MaterialRow({ material }: { material: Material }) {
  const { isBookmarked, addBookmark, removeBookmark } = useBookmarks()
  const { t } = useI18n()
  const vcat = getVirtualCategory(material)
  const bookmarked = isBookmarked(material.id)
  const TypeIcon = typeIconMap[material.fileType] || FileText

  return (
    <Link
      to="/subjects/$subjectId/materials/$materialId"
      params={{ subjectId: material.subjectId, materialId: material.id }}
      className="flex items-center gap-3 rounded-[0.563rem] border border-[var(--border-default)] bg-[var(--bg-surface)] px-3.5 py-2.5 transition-all duration-100 hover:border-[var(--border-strong)] hover:-translate-y-0.5 cursor-pointer"
    >
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-[0.438rem] border",
          typeTagStyles[material.fileType]?.container ||
            "border-[var(--border-default)] bg-[var(--bg-subtle)]",
        )}
      >
        <TypeIcon
          className={cn(
            "size-4",
            typeTagStyles[material.fileType]?.icon || "text-[var(--text-hint)]",
          )}
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-[0.813rem] font-medium leading-tight text-[var(--text-primary)]">
          {material.title}
        </div>
        <div className="mt-0.5 flex flex-wrap gap-1.5">
          <span
            className={`inline-block px-[0.438rem] py-[0.125rem] rounded-full text-[0.688rem] font-medium ${typeBadgeStyles[material.fileType] || "bg-[var(--bg-subtle)] text-[var(--text-secondary)]"}`}
          >
            {t(`materialType.${material.fileType}`) || material.fileType}
          </span>
          <span
            className={`inline-block px-[0.438rem] py-[0.125rem] rounded-full text-[0.688rem] font-medium ${categoryBadgeStyles[vcat] || "bg-[var(--bg-subtle)] text-[var(--text-secondary)]"}`}
          >
            {vcat === "final" ? t("category.exam") : t(`category.${vcat}`)}
          </span>
          {material.examPart && vcat !== material.examPart.toLowerCase() && (
            <span className="inline-block px-[0.438rem] py-[0.125rem] rounded-full text-[0.688rem] font-medium bg-[var(--bg-subtle)] text-[var(--text-secondary)]">
              {material.examPart}
            </span>
          )}
          {material.solved === true && (
            <span className="inline-block px-[0.438rem] py-[0.125rem] rounded-full text-[0.688rem] font-medium bg-[var(--status-later-bg)] text-[var(--status-later-text)]">
              {t("subject.solved_badge")}
            </span>
          )}
          {material.solved === false && (
            <span className="inline-block px-[0.438rem] py-[0.125rem] rounded-full text-[0.688rem] font-medium bg-[var(--status-soon-bg)] text-[var(--status-soon-text)]">
              {t("subject.unsolved_badge")}
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
        }}
        className="shrink-0 cursor-pointer min-w-[2.75rem] min-h-[2.75rem] md:min-w-[2rem] md:min-h-[2rem] flex items-center justify-center transition-transform duration-150 hover:scale-110"
      >
        <Star
          className={`size-4 transition-colors duration-150 ${
            bookmarked
              ? "fill-[var(--bookmark)] text-[var(--bookmark)] animate-bookmark-pop"
              : "text-[var(--border-strong)] hover:text-[var(--text-hint)]"
          }`}
        />
      </button>
    </Link>
  )
}

function SubjectPage() {
  const { subject, materials, exams } = Route.useLoaderData()
  const { locale } = useI18n()
  const t = (k: string, p?: Record<string, string | number>) => localeT(locale, k, p)

  const [fileTypeFilter, setFileTypeFilter] = useState<string>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const storageKey = `collapsed-categories-${subject.id}`
  const [collapsed, setCollapsed] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      return stored ? new Set(JSON.parse(stored)) : new Set()
    } catch {
      return new Set()
    }
  })

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify([...collapsed]))
  }, [collapsed, storageKey])

  const [searchQuery, setSearchQuery] = useState("")
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const debouncedQuery = useDebounce(searchQuery, 200)
  const searchedMaterials = useFuseSearch(
    materials,
    { keys: ["title"], threshold: 0.4 },
    debouncedQuery,
  )

  const filteredMaterials = searchedMaterials.filter((m) => {
    if (fileTypeFilter !== "all" && m.fileType !== fileTypeFilter) return false
    const vcat = getVirtualCategory(m)
    if (categoryFilter !== "all" && vcat !== categoryFilter) return false
    return true
  })

  type GroupedMaterials = { solved: Material[]; unsolved: Material[]; unknown: Material[] }
  const grouped: Record<string, GroupedMaterials> = {}
  for (const cat of categoryOrder) {
    grouped[cat] = { solved: [], unsolved: [], unknown: [] }
  }
  filteredMaterials.forEach((m) => {
    const vcat = getVirtualCategory(m)
    const target = grouped[vcat] || grouped.misc
    if (m.solved === true) target.solved.push(m)
    else if (m.solved === false) target.unsolved.push(m)
    else target.unknown.push(m)
  })

  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const nearestExam =
    exams
      .filter((e) => new Date(e.date + "T00:00:00") >= now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0] || null

  const examUrgency = nearestExam ? daysUntil(nearestExam.date) : null
  const examColor =
    examUrgency !== null
      ? examUrgency <= 14
        ? "bg-[var(--status-soon-bg)] border-[var(--status-soon-text)]/20 text-[var(--status-soon-text)]"
        : examUrgency <= 30
          ? "bg-[var(--status-mid-bg)] border-[var(--status-mid-text)]/20 text-[var(--status-mid-text)]"
          : "bg-[var(--status-later-bg)] border-[var(--status-later-text)]/20 text-[var(--status-later-text)]"
      : ""

  const categoryConfig: Record<string, { label: string; icon: typeof BookOpen }> = {
    theory: { label: t("category.theory"), icon: BookOpen },
    problems: { label: t("category.problems"), icon: Pencil },
    k1: { label: t("category.k1"), icon: FileText },
    k2: { label: t("category.k2"), icon: FileText },
    final: { label: t("category.exam"), icon: FileText },
    misc: { label: t("category.misc"), icon: Folder },
  }

  const toggleCollapse = (cat: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  return (
    <div>
      <div className="border-b bg-[var(--bg-surface)] border-[var(--border-default)]">
        <div className="md:px-9 md:pt-6 px-4 pt-4">
          <div className="mb-3.5 flex items-center gap-1.5 text-[0.75rem] text-[var(--text-hint)]">
            <Link
              to="/subjects"
              className="hover:text-[var(--text-primary)] transition-colors duration-100 md:py-0 py-2"
            >
              {t("subject.breadcrumb")}
            </Link>
            <span className="text-[0.688rem]">›</span>
            <span className="text-[var(--text-primary)]">{subject.name}</span>
          </div>

          <div className="mb-4 flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-[-0.3px] text-[var(--text-primary)]">
                {subject.name}
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-4 text-[0.813rem] text-[var(--text-secondary)]">
                <span>{t("subject.semester_fmt", { n: subject.semester })}</span>
                <span className="size-[0.188rem] rounded-full bg-[var(--border-strong)]" />
                <span>{subject.espb} ESPB</span>
                {subject.professors[0] && (
                  <>
                    <span className="size-[0.188rem] rounded-full bg-[var(--border-strong)]" />
                    <span>{subject.professors[0]}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {nearestExam && (
            <div
              className={`mb-4 flex items-center gap-3.5 rounded-[0.625rem] border px-4 py-3 ${examColor}`}
            >
              <FileText className="size-5 shrink-0" />
              <div className="flex-1">
                <div className="text-[0.813rem] font-semibold">{nearestExam.title}</div>
                <div className="mt-0.5 text-xs opacity-80">
                  {localeFormatDate(locale, nearestExam.date)} · {nearestExam.time}
                  {nearestExam.location ? ` · ${nearestExam.location}` : ""}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[1.375rem] font-bold">
                  {examUrgency !== null && examUrgency <= 0 ? t("subject.today") : examUrgency}
                </div>
                <div className="text-[0.688rem] opacity-75">
                  {examUrgency !== null && examUrgency <= 0 ? "" : t("subject.days")}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-[var(--border-default)] md:px-9 px-4 py-4">
          <div className="relative mb-4">
            <Search className="absolute left-[0.688rem] top-1/2 size-[0.938rem] -translate-y-1/2 text-[var(--text-hint)]" />
            <input
              type="search"
              placeholder={t("subject.search_placeholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-[0.5rem] border border-[var(--border-default)] bg-[var(--bg-subtle)] py-2 pl-8 pr-3 text-[0.813rem] text-[var(--text-primary)] outline-none transition-all duration-100 placeholder:text-[var(--text-hint)] focus:border-[var(--accent)] focus:bg-[var(--bg-surface)]"
            />
          </div>

          <div className="hidden md:flex flex-wrap items-start gap-6">
            <div className="flex flex-col gap-1.5">
              <div className="text-[0.625rem] font-semibold uppercase tracking-[0.05rem] text-[var(--text-hint)]">
                {t("subject.filter_file_type")}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { key: "all", label: t("subject.filter_all") },
                  { key: "pdf", label: "PDF" },
                  { key: "video", label: "Video" },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setFileTypeFilter(opt.key)}
                    className={`rounded-full border px-2.5 py-1 text-[0.75rem] transition-all duration-100 ${
                      fileTypeFilter === opt.key
                        ? "border-[var(--accent)] bg-[var(--accent-bg)] text-[var(--accent-strong)] font-medium"
                        : "border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-subtle)]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="text-[0.625rem] font-semibold uppercase tracking-[0.05rem] text-[var(--text-hint)]">
                {t("subject.filter_category")}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { key: "all", label: t("subject.filter_all_cat") },
                  ...categoryOrder.map((c) => ({ key: c, label: categoryConfig[c].label })),
                ].map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setCategoryFilter(opt.key)}
                    className={`rounded-full border px-2.5 py-1 text-[0.75rem] transition-all duration-100 ${
                      categoryFilter === opt.key
                        ? "border-[var(--accent)] bg-[var(--accent-bg)] text-[var(--accent-strong)] font-medium"
                        : "border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-subtle)]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
            <SheetTrigger className="md:hidden flex items-center gap-2 rounded-[0.5rem] border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 text-[0.813rem] text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]">
              <SlidersHorizontal className="size-4" />
              {t("subject.filter_file_type")}
              {(fileTypeFilter !== "all" || categoryFilter !== "all") && (
                <span className="inline-flex items-center justify-center size-5 rounded-full bg-[var(--accent)] text-[0.625rem] font-medium text-white">
                  {(fileTypeFilter !== "all" ? 1 : 0) + (categoryFilter !== "all" ? 1 : 0)}
                </span>
              )}
            </SheetTrigger>
            <SheetContent
              side="bottom"
              className="max-h-[85vh] flex flex-col data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-bottom-4"
            >
              <div className="mx-auto mt-2 mb-3 h-1 w-10 shrink-0 rounded-full bg-[var(--border-strong)]" />
              <SheetHeader>
                <SheetTitle className="text-left">{t("subject.filter_file_type")}</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto px-4 pb-6">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <span className="text-[0.625rem] font-semibold uppercase tracking-[0.05rem] text-[var(--text-hint)]">
                      {t("subject.filter_file_type")}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { key: "all", label: t("subject.filter_all") },
                        { key: "pdf", label: "PDF" },
                        { key: "video", label: "Video" },
                      ].map((opt) => (
                        <button
                          key={opt.key}
                          onClick={() => {
                            setFileTypeFilter(opt.key)
                            setFilterSheetOpen(false)
                          }}
                          className={`rounded-full border px-3 py-1.5 text-[0.75rem] transition-all duration-100 ${
                            fileTypeFilter === opt.key
                              ? "border-[var(--accent)] bg-[var(--accent-bg)] text-[var(--accent-strong)] font-medium"
                              : "border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-subtle)]"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <span className="text-[0.625rem] font-semibold uppercase tracking-[0.05rem] text-[var(--text-hint)]">
                      {t("subject.filter_category")}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { key: "all", label: t("subject.filter_all_cat") },
                        ...categoryOrder.map((c) => ({ key: c, label: categoryConfig[c].label })),
                      ].map((opt) => (
                        <button
                          key={opt.key}
                          onClick={() => {
                            setCategoryFilter(opt.key)
                            setFilterSheetOpen(false)
                          }}
                          className={`rounded-full border px-3 py-1.5 text-[0.75rem] transition-all duration-100 ${
                            categoryFilter === opt.key
                              ? "border-[var(--accent)] bg-[var(--accent-bg)] text-[var(--accent-strong)] font-medium"
                              : "border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-subtle)]"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="mt-7 max-w-[62.5rem] md:px-8 px-4 pb-8">
        {filteredMaterials.length === 0 ? (
          <div className="rounded-[0.563rem] border border-[var(--border-default)] bg-[var(--bg-surface)] py-10 text-center text-[0.813rem] text-[var(--text-hint)]">
            {t("subject.empty")}
          </div>
        ) : (
          categoryOrder.map((cat) => {
            const { solved, unsolved, unknown } = grouped[cat]
            const total = solved.length + unsolved.length + unknown.length
            if (total === 0) return null

            const CatIcon = categoryConfig[cat].icon
            const isCollapsed = collapsed.has(cat)
            const isExamCat = cat === "k1" || cat === "k2" || cat === "final"

            return (
              <section key={cat} className="mb-8">
                <button
                  onClick={() => toggleCollapse(cat)}
                  className="flex items-center gap-2 w-full text-left cursor-pointer group"
                >
                  <ChevronDown
                    className={cn(
                      "size-4 text-[var(--text-hint)] transition-transform duration-500 ease-out",
                      isCollapsed && "-rotate-90",
                    )}
                  />
                  <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                    <CatIcon className="size-4" />
                    {categoryConfig[cat].label}
                    <span className="inline-block px-[0.438rem] py-[0.125rem] rounded-full text-[0.688rem] font-medium bg-[var(--bg-subtle)] text-[var(--text-secondary)]">
                      {total}
                    </span>
                  </div>
                  <span className="h-px flex-1 bg-[var(--border-faint)]" />
                </button>

                <div
                  className={cn(
                    "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
                    isCollapsed ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100",
                  )}
                >
                  <div className="overflow-hidden min-h-0">
                    {isExamCat ? (
                      <div className="mt-3">
                        {solved.length > 0 && (
                          <div className="ml-5 mt-3">
                            <div className="mb-1.5 border-l-2 border-[var(--border-default)] py-1 pl-3 text-xs font-medium text-[var(--text-secondary)]">
                              {t("subject.solved_label_fmt", { n: solved.length })}
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
                            <div className="mb-1.5 border-l-2 border-[var(--border-default)] py-1 pl-3 text-xs font-medium text-[var(--text-secondary)]">
                              {t("subject.unsolved_label_fmt", { n: unsolved.length })}
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
                            <div className="mb-1.5 border-l-2 border-[var(--border-default)] py-1 pl-3 text-xs font-medium text-[var(--text-secondary)]">
                              {t("subject.other_label_fmt", { n: unknown.length })}
                            </div>
                            <div className="flex flex-col gap-1">
                              {unknown.map((m) => (
                                <MaterialRow key={m.id} material={m} />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1 mt-3">
                        {[...solved, ...unsolved, ...unknown].map((m) => (
                          <MaterialRow key={m.id} material={m} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )
          })
        )}
      </div>
    </div>
  )
}
