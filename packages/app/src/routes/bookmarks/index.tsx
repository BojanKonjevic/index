import { createFileRoute, Link } from "@tanstack/react-router"
import { Star, FileText, FileVideo, FileImage, Bookmark } from "lucide-react"
import { fetchBookmarkedMaterials, fetchDashboard } from "@/lib/api"
import { useBookmarks } from "@/hooks/useBookmarks"
import { useI18n } from "@/hooks/useI18n"
import { ErrorFallback } from "@/components/ErrorFallback"
import { getVirtualCategory } from "@/lib/categories"

export const Route = createFileRoute("/bookmarks/")({
  loader: async () => {
    const isGuest = typeof window !== "undefined" && localStorage.getItem("guest") === "true"
    if (isGuest) {
      const [dashboard, stored] = await Promise.all([
        fetchDashboard(),
        Promise.resolve(localStorage.getItem("bookmarks")),
      ])
      const bookmarkIds: string[] = stored ? JSON.parse(stored) : []
      const materials = dashboard.materials.filter((m) => bookmarkIds.includes(m.id))
      return { materials, subjectNameMap: dashboard.subjectNameMap }
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

  const typeIconMap: Record<string, typeof FileText> = {
    pdf: FileText,
    video: FileVideo,
    image: FileImage,
  }

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
            const vcat = getVirtualCategory(material)
            return (
              <Link
                key={material.id}
                to="/subjects/$subjectId/materials/$materialId"
                params={{ subjectId: material.subjectId, materialId: material.id }}
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
                      {material.title}
                    </div>
                    <div className="shrink-0 text-xs text-[var(--text-secondary)]">
                      {subjectName}
                    </div>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
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
                      <span className="inline-block px-[0.438rem] py-[0.125rem] rounded-full text-[0.688rem] font-medium bg-[var(--accent-bg)] text-[var(--accent-strong)]">
                        {t("subject.unsolved_badge")}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    removeBookmark(material.id)
                  }}
                  className="shrink-0 cursor-pointer min-w-[2.75rem] min-h-[2.75rem] flex items-center justify-center transition-transform duration-150 hover:scale-110"
                >
                  <Star className="size-4 fill-[var(--bookmark)] text-[var(--bookmark)] transition-colors duration-150" />
                </button>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
