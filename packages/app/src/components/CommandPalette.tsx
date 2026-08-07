import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react"
import { useLocation, useNavigate } from "@tanstack/react-router"
import { Search, X, ChevronRight, Loader2, BookOpen, Calendar } from "lucide-react"
import { useI18n } from "@/hooks/useI18n"
import { useSearchPalette } from "@/hooks/useSearchPalette"
import { useDebounce } from "@/hooks/useDebounce"
import { useFuseSearch } from "@/hooks/useFuseSearch"
import { fetchDashboard } from "@/lib/api"
import { SearchAbortedError, SearchSequenceGuard, searchContent } from "@/lib/api"
import { cn } from "@/lib/utils"
import { typeIconMap, typeTagStyles } from "@/lib/styles"
import type {
  DashboardData,
  Material,
  SearchContentResponse,
  SearchContentItem,
  SearchScope,
} from "@index/shared"

type Row =
  | {
      key: string
      kind: "subject"
      name: string
      sub: string
      activate: () => void
    }
  | {
      key: string
      kind: "material"
      title: string
      sub: string
      fileType: Material["fileType"]
      activate: () => void
    }
  | { key: string; kind: "exam"; title: string; sub: string; activate: () => void }
  | {
      key: string
      kind: "content"
      item: SearchContentItem
      activate: () => void
      openPage: (page: number) => void
    }

type Section = { header: string; rows: Row[] }

const emptyContent: SearchContentResponse["content"] = { total: 0, hasMore: false, items: [] }

function scopeFromPath(pathname: string): {
  mode: SearchScope
  subjectId: string | null
  materialId: string | null
} {
  const materialMatch = pathname.match(/^\/subjects\/([^/]+)\/materials\/([^/]+)/)
  if (materialMatch) {
    return { mode: "material", subjectId: materialMatch[1], materialId: materialMatch[2] }
  }
  const subjectMatch = pathname.match(/^\/subjects\/([^/]+)/)
  if (subjectMatch) {
    return { mode: "subject", subjectId: subjectMatch[1], materialId: null }
  }
  return { mode: "global", subjectId: null, materialId: null }
}

function SectionHeader({ children }: { children: string }) {
  return (
    <div className="sticky top-0 z-10 bg-[var(--bg-surface)] px-3 pb-1.5 pt-2.5 text-[0.625rem] font-semibold uppercase tracking-[0.05rem] text-[var(--text-hint)]">
      {children}
    </div>
  )
}

export default function CommandPalette() {
  const { open, closePalette } = useSearchPalette()
  if (!open) return null
  return <PaletteContent onClose={closePalette} />
}

function PaletteContent({ onClose }: { onClose: () => void }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useI18n()

  const [query, setQuery] = useState("")
  const debounced = useDebounce(query, 150)
  const [mode, setMode] = useState<SearchScope>(() => scopeFromPath(location.pathname).mode)
  const [subjectId, setSubjectId] = useState<string | null>(
    () => scopeFromPath(location.pathname).subjectId,
  )
  const [materialId, setMaterialId] = useState<string | null>(
    () => scopeFromPath(location.pathname).materialId,
  )
  const [activeIndex, setActiveIndex] = useState(0)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const [data, setData] = useState<DashboardData | null>(null)
  const [searchState, setSearchState] = useState<{
    q: string
    content: SearchContentResponse["content"]
    error: boolean
  } | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const guardRef = useRef<SearchSequenceGuard | null>(null)
  const keyboardNavRef = useRef(false)
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    guardRef.current = new SearchSequenceGuard()
    return () => {
      abortRef.current?.abort()
      guardRef.current = null
    }
  }, [])

  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    fetchDashboard()
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .catch(() => {
        if (!cancelled) setData(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  const resolved =
    mode === "global" ||
    (mode === "subject" && !!subjectId) ||
    (mode === "material" && !!materialId)
  const picking = (mode === "subject" && !subjectId) || (mode === "material" && !materialId)
  const cleanQuery = debounced.trim()
  const hasQuery = cleanQuery.length > 0

  const subjects = data?.subjects ?? []
  const materials = data?.materials ?? []
  const exams = data?.exams ?? []
  const subjectNameMap = data?.subjectNameMap ?? {}

  const scopeSubjects =
    mode === "subject" && subjectId ? subjects.filter((s) => s.id === subjectId) : subjects
  const scopeMaterials =
    mode === "subject" && subjectId ? materials.filter((m) => m.subjectId === subjectId) : materials
  const scopeExams =
    mode === "subject" && subjectId ? exams.filter((e) => e.subjectId === subjectId) : exams

  const subjectResults = useFuseSearch(
    scopeSubjects.map((s) => ({ id: s.id, name: s.name, semester: s.semester, espb: s.espb })),
    { keys: ["name"], threshold: 0.4 },
    debounced,
    5,
  )
  const materialResults = useFuseSearch(
    scopeMaterials.map((m) => ({ ...m, subjectName: subjectNameMap[m.subjectId] ?? "" })),
    { keys: ["title", "subjectName"], threshold: 0.4 },
    debounced,
    6,
  )
  const examResults = useFuseSearch(
    scopeExams.map((e) => ({ ...e, subjectName: subjectNameMap[e.subjectId] ?? "" })),
    { keys: ["title"], threshold: 0.4 },
    debounced,
    4,
  )

  const shownSubjects = useMemo(
    () => (hasQuery && !picking ? subjectResults : []),
    [hasQuery, picking, subjectResults],
  )
  const shownMaterials = useMemo(
    () => (hasQuery && !picking ? materialResults : []),
    [hasQuery, picking, materialResults],
  )
  const shownExams = useMemo(
    () => (hasQuery && !picking ? examResults : []),
    [hasQuery, picking, examResults],
  )
  const shownPicks = useMemo(
    () => (hasQuery && picking ? (mode === "subject" ? subjectResults : materialResults) : []),
    [hasQuery, picking, mode, subjectResults, materialResults],
  )

  const runSearch = (
    q: string,
    offset: number,
    m: SearchScope,
    sid: string | null,
    mid: string | null,
  ) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const guard = guardRef.current
    if (!guard) return
    const seq = guard.beginRequest()
    searchContent(
      {
        q,
        scope: m,
        subjectId: m === "subject" && sid ? sid : undefined,
        materialId: m === "material" && mid ? mid : undefined,
        limit: 20,
        offset,
      },
      controller.signal,
    )
      .then((res) => {
        if (!guard.shouldApply(seq)) return
        setSearchState((prev) => ({
          q,
          content:
            offset > 0 && prev?.q === q
              ? { ...res.content, items: [...prev.content.items, ...res.content.items] }
              : res.content,
          error: false,
        }))
      })
      .catch((err) => {
        if (err instanceof SearchAbortedError) return
        if (!guard.shouldApply(seq)) return
        setSearchState({ q, content: emptyContent, error: true })
      })
  }

  useEffect(() => {
    const q = cleanQuery
    if (q.length < 2 || !resolved || picking) {
      abortRef.current?.abort()
      return
    }
    runSearch(q, 0, mode, subjectId, materialId)
  }, [cleanQuery, resolved, picking, mode, subjectId, materialId])

  const activeSearch = searchState?.q === cleanQuery ? searchState : null
  const content = activeSearch?.content ?? null
  const contentError = activeSearch?.error ?? false
  const contentLoading = hasQuery && resolved && !picking && searchState?.q !== cleanQuery

  const openSubject = useCallback(
    (id: string) => {
      navigate({ to: "/subjects/$subjectId", params: { subjectId: id } })
      onClose()
    },
    [navigate, onClose],
  )
  const openMaterial = useCallback(
    (sid: string, mid: string, search?: { page?: number; hl?: string }) => {
      navigate({
        to: "/subjects/$subjectId/materials/$materialId",
        params: { subjectId: sid, materialId: mid },
        search,
      })
      onClose()
    },
    [navigate, onClose],
  )
  const pickSubject = useCallback((id: string) => {
    setSubjectId(id)
    setActiveIndex(0)
  }, [])
  const pickMaterial = useCallback((mid: string, sid: string) => {
    setMaterialId(mid)
    setSubjectId(sid)
    setActiveIndex(0)
  }, [])

  const sections: Section[] = useMemo(() => {
    const list: Section[] = []

    if (picking && hasQuery) {
      list.push({
        header: "",
        rows: shownPicks.map((p) =>
          "name" in p
            ? {
                key: `pick-s-${p.id}`,
                kind: "subject" as const,
                name: p.name,
                sub: `${p.semester}. semestar · ${p.espb} ESPB`,
                activate: () => pickSubject(p.id),
              }
            : {
                key: `pick-m-${p.id}`,
                kind: "material" as const,
                title: p.title,
                sub: p.subjectName,
                fileType: p.fileType,
                activate: () => pickMaterial(p.id, p.subjectId),
              },
        ),
      })
      return list
    }

    if (mode !== "material" && shownSubjects.length > 0) {
      list.push({
        header: t("palette.section_subjects"),
        rows: shownSubjects.map((s) => ({
          key: `s-${s.id}`,
          kind: "subject" as const,
          name: s.name,
          sub: `${s.semester}. semestar · ${s.espb} ESPB`,
          activate: () => openSubject(s.id),
        })),
      })
    }

    if (mode !== "material" && (shownMaterials.length > 0 || shownExams.length > 0)) {
      list.push({
        header: t("palette.section_materials"),
        rows: [
          ...shownMaterials.map(
            (m): Row => ({
              key: `m-${m.id}`,
              kind: "material",
              title: m.title,
              sub: m.subjectName,
              fileType: m.fileType,
              activate: () => {
                const hit = content ? content.items.find((i) => i.materialId === m.id) : undefined
                if (hit && (hit.firstPage || hit.pages.length > 0)) {
                  openMaterial(m.subjectId, m.id, {
                    page: hit.firstPage || hit.pages[0].page,
                    hl: query,
                  })
                } else {
                  openMaterial(m.subjectId, m.id)
                }
              },
            }),
          ),
          ...shownExams.map(
            (e): Row => ({
              key: `e-${e.id}`,
              kind: "exam",
              title: e.title,
              sub: e.subjectName,
              activate: () => openSubject(e.subjectId),
            }),
          ),
        ],
      })
    }

    if (hasQuery && resolved && content && content.items.length > 0) {
      list.push({
        header: t("palette.section_content"),
        rows: content.items.map((item): Row => {
          const page = item.firstPage || item.pages[0]?.page || 1
          return {
            key: `c-${item.materialId}`,
            kind: "content",
            item,
            activate: () =>
              openMaterial(item.subjectId, item.materialId, {
                page,
                hl: query,
              }),
            openPage: (pageNum) =>
              openMaterial(item.subjectId, item.materialId, {
                page: pageNum,
                hl: query,
              }),
          }
        }),
      })
    }

    return list
  }, [
    picking,
    hasQuery,
    query,
    mode,
    resolved,
    content,
    shownPicks,
    shownSubjects,
    shownMaterials,
    shownExams,
    openMaterial,
    openSubject,
    pickMaterial,
    pickSubject,
    t,
  ])

  const flatRows = useMemo(() => sections.flatMap((s) => s.rows), [sections])

  useLayoutEffect(() => {
    const container = listRef.current
    const row = container?.querySelectorAll("[data-palette-row]")[activeIndex] as
      | HTMLElement
      | undefined
    if (!container || !row) return
    const HEADER_OFFSET = 32
    const containerRect = container.getBoundingClientRect()
    const rowRect = row.getBoundingClientRect()
    const top = rowRect.top - containerRect.top + container.scrollTop
    const bottom = top + rowRect.height
    const viewTop = container.scrollTop + HEADER_OFFSET
    const viewBottom = container.scrollTop + container.clientHeight
    if (top < viewTop) container.scrollTo({ top: top - HEADER_OFFSET, behavior: "smooth" })
    else if (bottom > viewBottom)
      container.scrollTo({ top: bottom - container.clientHeight + 8, behavior: "smooth" })
  }, [activeIndex, flatRows.length])

  const clearSelection = () => {
    setSubjectId(null)
    setMaterialId(null)
    setActiveIndex(0)
  }

  const selectScope = (next: SearchScope) => {
    if (mode !== next) clearSelection()
    setMode(next)
    setActiveIndex(0)
  }

  const scopeUp = () => {
    if (mode === "material") {
      setMode("subject")
    } else if (mode === "subject") {
      setMode("global")
    }
    clearSelection()
  }

  const handleEscape = () => {
    if (mode !== "global" || picking) {
      selectScope("global")
      return
    }
    if (query) {
      setQuery("")
      return
    }
    onClose()
  }

  const loadMore = () => {
    const q = cleanQuery
    if (!q || !content) return
    runSearch(q, content.items.length, mode, subjectId, materialId)
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && ["1", "2", "3"].includes(e.key)) {
      e.preventDefault()
      selectScope(e.key === "1" ? "global" : e.key === "2" ? "subject" : "material")
      return
    }
    if (e.key === "Escape") {
      e.preventDefault()
      handleEscape()
      return
    }
    if (e.key === "Tab") {
      e.preventDefault()
      selectScope(mode === "global" ? "subject" : mode === "subject" ? "material" : "global")
      return
    }
    if (e.key === "Backspace" && !query) {
      scopeUp()
      return
    }
    if (e.key === "ArrowDown") {
      e.preventDefault()
      keyboardNavRef.current = true
      setActiveIndex((i) => Math.min(i + 1, Math.max(flatRows.length - 1, 0)))
      return
    }
    if (e.key === "ArrowUp") {
      e.preventDefault()
      keyboardNavRef.current = true
      setActiveIndex((i) => Math.max(i - 1, 0))
      return
    }
    if (e.key === "ArrowRight") {
      const row = flatRows[activeIndex]
      if (row?.kind === "content") {
        e.preventDefault()
        setExpanded((prev) => ({ ...prev, [row.item.materialId]: true }))
      }
      return
    }
    if (e.key === "Enter") {
      const row = flatRows[activeIndex]
      if (row) {
        e.preventDefault()
        row.activate()
      }
    }
  }

  const scopeLabel = (s: SearchScope) =>
    s === "global"
      ? t("palette.scope_all")
      : s === "subject"
        ? t("palette.scope_subject")
        : t("palette.scope_material")

  const selectedSubjectName = subjectId ? subjects.find((s) => s.id === subjectId)?.name : null
  const selectedMaterialTitle = materialId
    ? materials.find((m) => m.id === materialId)?.title
    : null
  const selectionLabel = mode === "subject" ? selectedSubjectName : selectedMaterialTitle

  const sumHits = content?.items.reduce((acc, item) => acc + item.hits, 0) ?? 0

  return (
    <div className="fixed inset-0 z-[60]">
      <div
        className="palette-backdrop absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="absolute inset-x-0 top-0 flex justify-center pt-[env(safe-area-inset-top)] md:top-[10vh] md:px-6">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("palette.placeholder")}
          className="palette-panel flex max-h-[85vh] w-full flex-col border-b border-[var(--border-default)] bg-[var(--bg-surface)] md:max-w-[42rem] md:rounded-xl md:border md:shadow-2xl"
        >
          <div className="flex items-center gap-2.5 px-3.5 py-3">
            <Search className="size-4 shrink-0 text-[var(--text-hint)]" />
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setActiveIndex(0)
              }}
              onKeyDown={onKeyDown}
              placeholder={
                picking
                  ? mode === "subject"
                    ? t("palette.pick_subject")
                    : t("palette.pick_material")
                  : mode === "subject"
                    ? t("palette.placeholder_subject")
                    : mode === "material"
                      ? t("palette.placeholder_material")
                      : t("palette.placeholder")
              }
              aria-label={t("palette.placeholder")}
              className="min-w-0 flex-1 bg-transparent text-[0.938rem] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-hint)]"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="clear"
                className="cursor-pointer text-[var(--text-hint)] hover:text-[var(--text-primary)]"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 px-3.5 pb-2">
            {(["global", "subject", "material"] as SearchScope[]).map((s) => (
              <button
                key={s}
                onClick={() => selectScope(s)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[0.688rem] font-medium transition-colors cursor-pointer",
                  mode === s
                    ? "bg-[var(--accent-bg)] text-[var(--accent-strong)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]",
                )}
              >
                {scopeLabel(s)}
              </button>
            ))}
            {selectionLabel && (
              <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-[var(--bg-subtle)] px-2.5 py-1 text-[0.688rem] font-medium text-[var(--text-primary)]">
                {selectionLabel}
                <button
                  onClick={clearSelection}
                  aria-label="clear scope"
                  className="cursor-pointer text-[var(--text-hint)] hover:text-[var(--text-primary)]"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}
          </div>

          <div
            ref={listRef}
            onMouseMove={(e) => {
              const last = lastPointerRef.current
              if (!last || Math.abs(e.clientX - last.x) > 3 || Math.abs(e.clientY - last.y) > 3) {
                lastPointerRef.current = { x: e.clientX, y: e.clientY }
                keyboardNavRef.current = false
              }
            }}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
          >
            {sections.length === 0 && hasQuery && (
              <div className="px-3.5 py-3 text-xs text-[var(--text-hint)]">
                {t("palette.no_results")}
              </div>
            )}

            {flatRows.map((row, index) => {
              const section = sections.find((s) => s.rows.includes(row))
              const isFirstInSection = section?.rows[0] === row
              return (
                <div key={row.key}>
                  {section && section.header && isFirstInSection && (
                    <SectionHeader>{section.header}</SectionHeader>
                  )}
                  <RowView
                    row={row}
                    active={index === activeIndex}
                    expanded={row.kind === "content" ? !!expanded[row.item.materialId] : false}
                    onHover={() => {
                      if (keyboardNavRef.current) return
                      setActiveIndex(index)
                    }}
                    onExpandToggle={() =>
                      row.kind === "content" &&
                      setExpanded((prev) => ({
                        ...prev,
                        [row.item.materialId]: !prev[row.item.materialId],
                      }))
                    }
                    hitsLabel={
                      row.kind === "content"
                        ? row.item.hits === 1
                          ? t("palette.hits_one")
                          : t("palette.hits_fmt", { n: row.item.hits })
                        : ""
                    }
                  />
                </div>
              )
            })}

            {content && content.items.length > 0 && (
              <div className="flex items-center justify-between px-3.5 py-2 text-[0.688rem] text-[var(--text-hint)]">
                <span>
                  {t(
                    content.total === 1 ? "palette.footer_hits_in_one" : "palette.footer_hits_fmt",
                    {
                      hits: sumHits,
                      materials: content.total,
                    },
                  )}
                </span>
                {content.hasMore && (
                  <button
                    onClick={loadMore}
                    className="cursor-pointer font-medium text-[var(--accent-strong)] hover:underline"
                  >
                    {t("palette.load_more")}
                  </button>
                )}
              </div>
            )}

            {hasQuery && resolved && !picking && (
              <div className="border-t border-[var(--border-faint)] px-3.5 py-2">
                {contentLoading ? (
                  <div className="flex items-center gap-2 text-xs text-[var(--text-hint)]">
                    <Loader2 className="size-3.5 animate-spin" />
                    {t("palette.content_loading")}
                  </div>
                ) : contentError ? (
                  <div className="text-xs text-[var(--status-soon-text)]">{t("palette.error")}</div>
                ) : content && content.items.length === 0 ? (
                  <div className="text-xs text-[var(--text-hint)]">
                    {t("palette.content_empty")}
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-[var(--border-faint)] px-3.5 py-2 text-[0.688rem] text-[var(--text-hint)]">
            <div className="hidden items-center gap-1.5 md:flex">
              <kbd className="rounded border border-[var(--border-default)] px-1 font-sans">↑↓</kbd>
              <span>·</span>
              <kbd className="rounded border border-[var(--border-default)] px-1 font-sans">↵</kbd>
              <span>·</span>
              <kbd className="rounded border border-[var(--border-default)] px-1 font-sans">
                esc
              </kbd>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function RowView({
  row,
  active,
  expanded,
  onHover,
  onExpandToggle,
  hitsLabel,
}: {
  row: Row
  active: boolean
  expanded: boolean
  onHover: () => void
  onExpandToggle: () => void
  hitsLabel: string
}) {
  const { t } = useI18n()

  if (row.kind === "content") {
    const Icon = typeIconMap[row.item.fileType] ?? null
    const ts = typeTagStyles[row.item.fileType]
    return (
      <div
        data-palette-row
        role="button"
        onClick={row.activate}
        onMouseEnter={onHover}
        className={cn(
          "cursor-pointer px-3 py-2 transition-colors",
          active && "bg-[var(--bg-subtle)]",
        )}
      >
        <div className="flex w-full items-center gap-3 text-left text-[0.813rem]">
          <div
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded border",
              ts?.container || "border-[var(--border-default)] bg-[var(--bg-subtle)]",
            )}
          >
            {Icon ? (
              <Icon className={cn("size-3.5", ts?.icon || "text-[var(--text-secondary)]")} />
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium text-[var(--text-primary)]">{row.item.title}</div>
            <div className="truncate text-xs text-[var(--text-secondary)]">
              {row.item.subjectName}
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-[var(--bg-subtle)] px-1.5 py-0.5 text-[0.625rem] font-medium text-[var(--text-secondary)]">
            {hitsLabel}
          </span>
          {row.item.pages.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onExpandToggle()
              }}
              aria-label={t("palette.more_pages")}
              className="shrink-0 cursor-pointer text-[var(--text-hint)] hover:text-[var(--text-primary)]"
            >
              <ChevronRight
                className={cn("size-4 transition-transform", expanded && "rotate-90")}
              />
            </button>
          )}
        </div>
        {row.item.pages.map((p, i) => (
          <div key={p.page} className={cn("mt-1.5 pl-10", i > 0 && !expanded && "hidden")}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                row.openPage(p.page)
              }}
              className="flex w-full cursor-pointer items-baseline gap-2 rounded px-1 py-0.5 text-left transition-colors hover:bg-[var(--bg-subtle)]"
            >
              <span className="shrink-0 text-[0.625rem] font-medium text-[var(--text-hint)]">
                str. {p.page}
              </span>
              <span
                className="search-hit-container min-w-0 flex-1 text-xs leading-relaxed text-[var(--text-secondary)]"
                dangerouslySetInnerHTML={{ __html: p.snippet }}
              />
            </button>
          </div>
        ))}
      </div>
    )
  }

  const isSubject = row.kind === "subject"
  const isExam = row.kind === "exam"
  const Icon = isSubject ? BookOpen : isExam ? Calendar : (typeIconMap[row.fileType] ?? null)
  const ts = !isSubject && !isExam ? typeTagStyles[row.fileType] : undefined

  return (
    <button
      data-palette-row
      onMouseEnter={onHover}
      onClick={row.activate}
      className={cn(
        "flex w-full cursor-pointer items-center gap-3 px-3 py-2 text-left text-[0.813rem] transition-colors",
        active ? "bg-[var(--bg-subtle)]" : "",
      )}
    >
      <div
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded border",
          ts?.container || "border-[var(--border-default)] bg-[var(--bg-subtle)]",
        )}
      >
        {Icon ? (
          <Icon className={cn("size-3.5", ts?.icon || "text-[var(--text-secondary)]")} />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-[var(--text-primary)]">
          {row.kind === "subject" ? row.name : row.title}
        </div>
        <div className="truncate text-xs text-[var(--text-secondary)]">{row.sub}</div>
      </div>
    </button>
  )
}
