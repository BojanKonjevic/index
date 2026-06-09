import { createFileRoute, Link } from "@tanstack/react-router"
import { Star, FileText, Bookmark } from "lucide-react"
import { fetchBookmarkedMaterials, fetchDashboard } from "@/lib/api"
import { useAssetCache } from "@/hooks/useAssetCache"
import { MaterialBadges } from "@/components/MaterialBadges"
import ExpandableAssets from "@/components/ExpandableAssets"
import { useBookmarks } from "@/hooks/useBookmarks"
import { useI18n } from "@/hooks/useI18n"
import { ErrorFallback } from "@/components/ErrorFallback"
import { typeIconMap, typeTagStyles } from "@/lib/styles"

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
        const dashboard = await fetchDashboard()
        const materials = dashboard.materials.filter((m) => bookmarkIds.includes(m.id))
        return { materials, subjectNameMap: dashboard.subjectNameMap }
      } catch (e) {
        console.error("Failed to fetch dashboard for guest bookmarks:", e)
        return { materials: [], subjectNameMap: {} }
      }
    }
    return fetchBookmarkedMaterials()
  },
  component: BookmarksPage,
  errorComponent: ErrorFallback,
})

function BookmarksPage() {
  const { materials, subjectNameMap } = Route.useLoaderData()
  const { bookmarks, removeBookmark } = useBookmarks()
  const { t } = useI18n()
  const { cache: assetCache, loading: loadingAssets, load: handleExpandAssets } = useAssetCache()

  const items = materials
    .filter((m) => bookmarks.includes(m.id))
    .sort((a, b) => a.title.localeCompare(b.title))

  return (
    <div className="mx-auto max-w-[45rem] md:p-8 p-4 md:pt-8 pt-5">
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
        <div className="flex flex-col items-center gap-3 rounded-[0.563rem] border border-[var(--border-default)] bg-[var(--bg-surface)] py-16">
          <Bookmark className="size-10 text-[var(--text-hint)]" />
          <p className="text-sm text-[var(--text-secondary)]">{t("bookmarks.empty")}</p>
          <Link
            to="/subjects"
            className="rounded-[0.5rem] px-4 py-2 text-sm font-medium bg-[var(--text-primary)] text-[var(--bg-surface)] transition-all duration-100 hover:opacity-85 active:scale-[0.98]"
          >
            {t("bookmarks.browse")}
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {items.map((material) => {
            const ts = typeTagStyles[material.fileType]
            const TypeIcon = typeIconMap[material.fileType] || FileText
            const subjectName = subjectNameMap[material.subjectId] || ""
            const assetCount = material.assetCount ?? 0
            return (
              <div key={material.id}>
                <Link
                  to="/subjects/$subjectId/materials/$materialId"
                  params={{ subjectId: material.subjectId, materialId: material.id }}
                  search={{}}
                  className="flex items-center gap-3 rounded-[0.563rem] border border-[var(--border-default)] bg-[var(--bg-surface)] px-3.5 py-2.5 transition-all duration-100 hover:border-[var(--border-strong)] hover:-translate-y-0.5"
                >
                  <div
                    className={`flex size-9 shrink-0 items-center justify-center rounded-[0.438rem] border ${ts?.container || "border-[var(--border-default)] bg-[var(--bg-subtle)]"}`}
                  >
                    <TypeIcon className={`size-4 ${ts?.icon || "text-[var(--text-hint)]"}`} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[0.813rem] font-medium leading-tight text-[var(--text-primary)]">
                      {material.title}
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <MaterialBadges material={material} />
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-0.5">
                    <div className="text-xs text-[var(--text-secondary)] leading-tight pt-0.5">
                      {subjectName}
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        removeBookmark(material.id)
                      }}
                      className="cursor-pointer flex items-center justify-center size-[1.375rem] transition-transform duration-150 hover:scale-110"
                    >
                      <Star className="size-4 fill-[var(--bookmark)] text-[var(--bookmark)] transition-colors duration-150" />
                    </button>
                  </div>
                </Link>

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
      )}
    </div>
  )
}
