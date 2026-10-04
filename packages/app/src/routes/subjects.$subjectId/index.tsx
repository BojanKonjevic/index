import { createFileRoute, Link } from "@tanstack/react-router"
import { FileText, BookOpen, ChevronDown, SlidersHorizontal } from "lucide-react"
import { fetchSubject } from "@/lib/api"
import { daysUntil, parseISODate } from "@/lib/utils"
import { formatDate } from "@/lib/i18n"
import { useI18n } from "@/hooks/useI18n"
import { ErrorFallback } from "@/components/ErrorFallback"
import { MaterialBadges } from "@/components/MaterialBadges"
import ExpandableAssets from "@/components/ExpandableAssets"
import { MaterialFilters } from "@/components/MaterialFilters"
import type { Material } from "@index/shared"
import { describeGroup, getVirtualCategory, sortGroupKeys } from "@/lib/categories"
import { useState, useEffect, useMemo } from "react"
import { cn } from "@/lib/utils"
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { formatVisual } from "@/lib/styles"
import { useOfflineDownloads } from "@/hooks/useOfflineDownloads"
import { SubjectOfflineControls } from "@/components/SubjectOfflineControls"
import { OfflineBadge } from "@/components/OfflineBadge"
import { PageContainer } from "@/components/PageContainer"
import { EmptyState } from "@/components/EmptyState"
import { BookmarkButton } from "@/components/BookmarkButton"

export const Route = createFileRoute("/subjects/$subjectId/")({
  loader: ({ params }) => fetchSubject(params.subjectId),
  component: SubjectPage,
  errorComponent: ErrorFallback,
})

function solvedRank(m: Material): number {
  if (m.solved === true) return 0
  if (m.solved === false) return 1
  return 2
}

function bySolvedThenTitle(a: Material, b: Material): number {
  return solvedRank(a) - solvedRank(b) || a.title.localeCompare(b.title, "sr", { numeric: true })
}

// eslint-disable-next-line react-refresh/only-export-components
function MaterialRow({ material, offline }: { material: Material; offline: boolean }) {
  const { t } = useI18n()
  const { Icon: TypeIcon, tag } = formatVisual(material.fileType, material.url)
  const assetCount = material.assets?.length ?? material.assetCount ?? 0

  return (
    <div>
      <div className="relative">
        <Link
          to="/subjects/$subjectId/materials/$materialId"
          params={{ subjectId: material.subjectId, materialId: material.id }}
          search={{}}
          className="flex items-center gap-3 rounded-[0.563rem] border border-[var(--border-default)] bg-[var(--bg-surface)] px-3.5 py-2.5 pr-14 transition-colors duration-100 hover:border-[var(--border-strong)] cursor-pointer"
        >
          <div
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-[0.438rem] border",
              tag.container || "border-[var(--border-default)] bg-[var(--bg-subtle)]",
            )}
          >
            <TypeIcon className={cn("size-4", tag.icon || "text-[var(--text-hint)]")} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="truncate text-[0.813rem] font-medium leading-tight text-[var(--text-primary)]">
              {material.title}
              {material.pageCount != null && material.pageCount > 0 && (
                <span className="ml-1.5 font-normal text-[var(--text-hint)]">
                  · {t("subject.pages_fmt", { n: material.pageCount })}
                </span>
              )}
            </div>
            {material.description && (
              <div className="mt-0.5 line-clamp-2 text-[0.688rem] leading-snug text-[var(--text-hint)]">
                {material.description}
              </div>
            )}
            <div className="mt-0.5 flex flex-wrap gap-1.5">
              <MaterialBadges material={material} />
              {material.category === "exam" && assetCount === 0 && (
                <span className="inline-block px-[0.438rem] py-[0.125rem] rounded-full text-[0.688rem] font-medium bg-[var(--bg-subtle)] text-[var(--text-hint)]">
                  {t("subject.no_solution")}
                </span>
              )}
              {(material.tags ?? []).map((tag) => (
                <span
                  key={tag}
                  className="inline-block px-[0.438rem] py-[0.125rem] rounded-full text-[0.688rem] font-medium bg-[var(--bg-subtle)] text-[var(--text-secondary)]"
                >
                  {tag}
                </span>
              ))}
              {offline && <OfflineBadge />}
            </div>
          </div>
        </Link>
        <div className="absolute right-1 top-1/2 -translate-y-1/2 shrink-0">
          <BookmarkButton id={material.id} size="size-4" />
        </div>
      </div>

      <ExpandableAssets
        assets={material.assets}
        subjectId={material.subjectId}
        materialId={material.id}
        assetCount={assetCount}
      />
    </div>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
function SubjectPage() {
  const { subject, materials, exams, revision } = Route.useLoaderData()
  const { t, locale } = useI18n()
  const { isDownloaded } = useOfflineDownloads()
  const offline = isDownloaded(subject.id)

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

  const [filterSheetOpen, setFilterSheetOpen] = useState(false)

  const filteredMaterials = useMemo(
    () =>
      materials
        .filter((m) => {
          if (fileTypeFilter !== "all" && m.fileType !== fileTypeFilter) return false
          const vcat = getVirtualCategory(m)
          if (categoryFilter !== "all" && vcat !== categoryFilter) return false
          return true
        })
        .sort((a, b) => a.title.localeCompare(b.title, "sr", { numeric: true })),
    [materials, fileTypeFilter, categoryFilter],
  )

  type GroupedMaterials = { solved: Material[]; unsolved: Material[]; unknown: Material[] }
  // Dynamic groups: every exam part present becomes its own shelf, so a new
  // sitting never falls into misc. Unknown future parts sort naturally.
  const presentGroups = useMemo(
    () => sortGroupKeys([...new Set(filteredMaterials.map((m) => getVirtualCategory(m)))]),
    [filteredMaterials],
  )
  const grouped: Record<string, GroupedMaterials> = {}
  for (const cat of presentGroups) {
    grouped[cat] = { solved: [], unsolved: [], unknown: [] }
  }
  filteredMaterials.forEach((m) => {
    const vcat = getVirtualCategory(m)
    const target = grouped[vcat]
    if (!target) return
    if (m.solved === true) target.solved.push(m)
    else if (m.solved === false) target.unsolved.push(m)
    else target.unknown.push(m)
  })

  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const nearestExam =
    exams
      .filter((e) => parseISODate(e.date) >= now)
      .sort((a, b) => parseISODate(a.date).getTime() - parseISODate(b.date).getTime())[0] || null

  const examUrgency = nearestExam ? daysUntil(nearestExam.date) : null
  const examColor =
    examUrgency !== null
      ? examUrgency <= 14
        ? "bg-[var(--status-soon-bg)] border-[var(--status-soon-text)]/20 text-[var(--status-soon-text)]"
        : examUrgency <= 30
          ? "bg-[var(--status-mid-bg)] border-[var(--status-mid-text)]/20 text-[var(--status-mid-text)]"
          : "bg-[var(--status-later-bg)] border-[var(--status-later-text)]/20 text-[var(--status-later-text)]"
      : ""

  const categoryConfig = useMemo(() => {
    const record: Record<string, { label: string; icon: typeof BookOpen }> = {}
    for (const key of presentGroups) {
      const def = describeGroup(key, t)
      record[key] = { label: def.label, icon: def.icon }
    }
    return record
  }, [t, presentGroups])

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
        <PageContainer className="pt-4 md:pt-6">
          <div className="mb-3 flex items-center gap-1.5 text-[0.75rem] text-[var(--text-hint)]">
            <Link
              to="/"
              hash="subjects"
              className="hover:text-[var(--text-primary)] transition-colors duration-100 md:py-0 py-2"
            >
              {t("subject.breadcrumb")}
            </Link>
            <span className="text-[0.688rem]">›</span>
            <span className="text-[var(--text-primary)]">{subject.name}</span>
          </div>

          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="font-serif text-2xl font-bold tracking-[-0.3px] text-[var(--text-primary)]">
                {subject.name}
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.813rem] text-[var(--text-secondary)]">
                <span>{t("subject.semester_fmt", { n: subject.semester })}</span>
                <span className="size-[0.188rem] rounded-full bg-[var(--border-strong)]" />
                <span>{subject.espb} ESPB</span>
                {subject.professors[0] && (
                  <>
                    <span className="size-[0.188rem] rounded-full bg-[var(--border-strong)]" />
                    <span className="truncate">{subject.professors[0]}</span>
                  </>
                )}
              </div>
            </div>
            <div className="hidden shrink-0 md:block">
              <SubjectOfflineControls subjectId={subject.id} revision={revision} />
            </div>
          </div>

          {nearestExam && (
            <div
              className={`mb-3 flex items-center gap-3 rounded-[0.563rem] border px-3 py-2 ${examColor}`}
            >
              <FileText className="size-4 shrink-0" />
              <div className="min-w-0 flex-1 truncate text-[0.813rem] font-medium">
                {nearestExam.title}
                <span className="ml-2 font-normal opacity-80">
                  {formatDate(locale, nearestExam.date)}
                  {nearestExam.time ? ` · ${nearestExam.time}` : ""}
                  {nearestExam.location ? ` · ${nearestExam.location}` : ""}
                </span>
              </div>
              <span className="shrink-0 rounded-full bg-[var(--bg-surface)]/60 px-2 py-0.5 text-[0.688rem] font-semibold">
                {examUrgency !== null && examUrgency <= 0
                  ? t("subject.today")
                  : t("subject.exam_count_fmt", { n: examUrgency ?? 0 })}
              </span>
            </div>
          )}

          <div className="md:hidden">
            <SubjectOfflineControls subjectId={subject.id} revision={revision} className="mb-3" />
          </div>
        </PageContainer>

        <div className="sticky top-14 z-30 border-t border-[var(--border-default)] bg-[var(--bg-surface)]">
          <PageContainer className="py-3">
            <MaterialFilters
              fileTypeFilter={fileTypeFilter}
              setFileTypeFilter={setFileTypeFilter}
              categoryFilter={categoryFilter}
              setCategoryFilter={setCategoryFilter}
              categoryConfig={categoryConfig}
            />

            <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
              <SheetTrigger className="md:hidden flex items-center gap-2 rounded-[0.5rem] border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 text-[0.813rem] text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]">
                <SlidersHorizontal className="size-4" />
                {t("subject.filter_file_type")}
                {(fileTypeFilter !== "all" || categoryFilter !== "all") && (
                  <span className="inline-flex items-center justify-center size-5 rounded-full bg-[var(--accent)] text-[0.625rem] font-medium text-[var(--bg-page)]">
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
                  <MaterialFilters
                    fileTypeFilter={fileTypeFilter}
                    setFileTypeFilter={setFileTypeFilter}
                    categoryFilter={categoryFilter}
                    setCategoryFilter={setCategoryFilter}
                    categoryConfig={categoryConfig}
                    variant="mobile"
                    onFilter={() => setFilterSheetOpen(false)}
                  />
                </div>
              </SheetContent>
            </Sheet>
          </PageContainer>
        </div>
      </div>

      <PageContainer className="mt-7 pb-8">
        {filteredMaterials.length === 0 ? (
          <EmptyState message={t("subject.empty")} />
        ) : (
          presentGroups.map((cat) => {
            const { solved, unsolved, unknown } = grouped[cat]
            const total = solved.length + unsolved.length + unknown.length
            if (total === 0) return null

            const CatIcon = categoryConfig[cat].icon
            const isCollapsed = collapsed.has(cat)
            // Materials with a study unit render in vezba subsections so one
            // vezba reads as one block: zadatak, rešenje, kod, podaci.
            // Solved state is carried by row badges, not sub-headers.
            const catMaterials = [...solved, ...unsolved, ...unknown]
            const units = [...new Set(catMaterials.flatMap((m) => (m.unit ? [m.unit] : [])))].sort(
              (a, b) => a.localeCompare(b, "sr", { numeric: true }),
            )
            const inUnit = (m: Material) => m.unit != null && units.includes(m.unit)
            const rest = catMaterials.filter((m) => !inUnit(m)).sort(bySolvedThenTitle)
            const sections: { label: string | null; mats: Material[] }[] =
              units.length === 0
                ? [{ label: null, mats: [...catMaterials].sort(bySolvedThenTitle) }]
                : [
                    ...units.map((u) => ({
                      label: t("subject.unit_fmt", { n: u }),
                      mats: catMaterials.filter((m) => m.unit === u).sort(bySolvedThenTitle),
                    })),
                    ...(rest.length > 0 ? [{ label: t("category.other"), mats: rest }] : []),
                  ]

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
                    {sections.map((section) => (
                      <div key={section.label ?? "all"} className="mt-3">
                        {section.label && (
                          <div className="mb-1.5 border-l-2 border-[var(--accent)] py-1 pl-3 text-xs font-semibold text-[var(--text-primary)]">
                            {section.label}
                          </div>
                        )}
                        <div className={cn("flex flex-col gap-1", section.label && "ml-5")}>
                          {section.mats.map((m) => (
                            <MaterialRow key={m.id} material={m} offline={offline} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )
          })
        )}
      </PageContainer>
    </div>
  )
}
