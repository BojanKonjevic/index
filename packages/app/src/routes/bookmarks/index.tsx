/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, Link } from "@tanstack/react-router"
import { Bookmark } from "lucide-react"
import { fetchBookmarkedMaterials, fetchDashboard, fetchMaterialsByIds } from "@/lib/api"
import { useAssetCache } from "@/hooks/useAssetCache"
import { MaterialBadges } from "@/components/MaterialBadges"
import ExpandableAssets from "@/components/ExpandableAssets"
import { useBookmarks } from "@/hooks/useBookmarks"
import { useI18n } from "@/hooks/useI18n"
import { ErrorFallback } from "@/components/ErrorFallback"
import { formatVisual } from "@/lib/styles"
import { PageContainer } from "@/components/PageContainer"
import { EmptyState } from "@/components/EmptyState"
import { BookmarkButton } from "@/components/BookmarkButton"

export const Route = createFileRoute("/bookmarks/")({
  staleTime: 0,
  gcTime: 0,
  loader: async () => {
    const isGuest = typeof window !== "undefined" && localStorage.getItem("guest") === "true"
    if (isGuest) {
      const stored = localStorage.getItem("bookmarks")
      if (!stored) return { materials: [], subjectNameMap: {} }
      const bookmarkIds: string[] = JSON.parse(stored)
      if (bookmarkIds.length === 0) return { materials: [], subjectNameMap: {} }
      try {
        return await fetchMaterialsByIds(bookmarkIds)
      } catch (e) {
        console.error("Failed to fetch guest bookmarks:", e)
        // The by-ids URL varies with every edit so the service worker
        // rarely has it cached; fall back to the dashboard fetch, whose
        // stable URL serves the last-good cache offline.
        try {
          const dashboard = await fetchDashboard()
          const materials = dashboard.materials.filter((m) => bookmarkIds.includes(m.id))
          return { materials, subjectNameMap: dashboard.subjectNameMap }
        } catch {
          return { materials: [], subjectNameMap: {} }
        }
      }
    }
    return fetchBookmarkedMaterials()
  },
  component: BookmarksPage,
  errorComponent: ErrorFallback,
})

function BookmarksPage() {
  const { materials, subjectNameMap } = Route.useLoaderData()
  const { bookmarks } = useBookmarks()
  const { t } = useI18n()
  const { cache: assetCache, loading: loadingAssets, load: handleExpandAssets } = useAssetCache()

  const items = materials
    .filter((m) => bookmarks.includes(m.id))
    .sort((a, b) => a.title.localeCompare(b.title, "sr"))

  const grouped: { subjectId: string; subjectName: string; items: typeof items }[] = []
  const bySubject = new Map<string, (typeof items)[number][]>()
  for (const m of items) {
    const list = bySubject.get(m.subjectId) ?? []
    list.push(m)
    bySubject.set(m.subjectId, list)
  }
  for (const [subjectId, list] of bySubject) {
    grouped.push({
      subjectId,
      subjectName: subjectNameMap[subjectId] || "",
      items: list,
    })
  }
  grouped.sort((a, b) => a.subjectName.localeCompare(b.subjectName, "sr"))

  return (
    <PageContainer narrow className="pt-5 md:pt-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-[-0.3px] text-[var(--text-primary)]">
          {t("bookmarks.title")}
        </h1>
        <p className="mt-0.5 text-[0.813rem] text-[var(--text-secondary)]">
          {items.length === 1
            ? t("bookmarks.count_fmt", { n: items.length })
            : t("bookmarks.count_plural_fmt", { n: items.length })}
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<Bookmark className="size-10 text-[var(--text-hint)]" />}
          message={t("bookmarks.empty")}
          action={
            <Link
              to="/"
              hash="subjects"
              className="mt-1 rounded-[0.5rem] px-4 py-2 text-sm font-medium bg-[var(--text-primary)] text-[var(--bg-surface)] transition-opacity hover:opacity-85"
            >
              {t("bookmarks.browse")}
            </Link>
          }
        />
      ) : (
        grouped.map((group) => (
          <section key={group.subjectId} className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <Link
                to="/subjects/$subjectId"
                params={{ subjectId: group.subjectId }}
                className="shrink-0 text-[0.625rem] font-semibold uppercase tracking-[0.05rem] text-[var(--text-hint)] transition-colors hover:text-[var(--text-primary)]"
              >
                {group.subjectName}
              </Link>
              <span className="h-px flex-1 bg-[var(--border-faint)]" />
              <span className="shrink-0 text-[0.625rem] text-[var(--text-hint)]">
                {group.items.length}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              {group.items.map((material) => {
                const { Icon: TypeIcon, tag } = formatVisual(material.fileType, material.url)
                const assetCount = material.assetCount ?? 0
                return (
                  <div key={material.id}>
                    <div className="relative">
                      <Link
                        to="/subjects/$subjectId/materials/$materialId"
                        params={{ subjectId: material.subjectId, materialId: material.id }}
                        search={{}}
                        className="flex items-center gap-3 rounded-[0.563rem] border border-[var(--border-default)] bg-[var(--bg-surface)] px-3.5 py-2.5 pr-14 transition-colors duration-100 hover:border-[var(--border-strong)]"
                      >
                        <div
                          className={`flex size-9 shrink-0 items-center justify-center rounded-[0.438rem] border ${tag.container || "border-[var(--border-default)] bg-[var(--bg-subtle)]"}`}
                        >
                          <TypeIcon className={`size-4 ${tag.icon || "text-[var(--text-hint)]"}`} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[0.813rem] font-medium leading-tight text-[var(--text-primary)]">
                            {material.title}
                          </div>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            <MaterialBadges material={material} />
                          </div>
                        </div>
                      </Link>
                      <div className="absolute right-1 top-1/2 -translate-y-1/2 shrink-0">
                        <BookmarkButton id={material.id} size="size-4" />
                      </div>
                    </div>

                    <ExpandableAssets
                      assets={assetCache[material.id]}
                      subjectId={material.subjectId}
                      materialId={material.id}
                      assetCount={assetCount}
                      loading={!!loadingAssets[material.id]}
                      onExpand={() => handleExpandAssets(material.id)}
                    />
                  </div>
                )
              })}
            </div>
          </section>
        ))
      )}
    </PageContainer>
  )
}
