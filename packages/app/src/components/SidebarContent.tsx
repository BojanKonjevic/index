import { Link } from "@tanstack/react-router"
import { FileText, FileImage } from "lucide-react"
import { useI18n } from "@/hooks/useI18n"
import ExpandableAssets from "@/components/ExpandableAssets"
import { BookmarkButton } from "./BookmarkButton"
import { OfflineBadge } from "./OfflineBadge"
import { typeIconMap, typeTagStyles, typeBadgeStyles } from "@/lib/styles"
import { CATEGORY_ORDER } from "@index/shared"
import type { Material } from "@index/shared"

interface SidebarContentProps {
  sidebarMode: "category" | "all" | "this"
  setSidebarMode: (mode: "category" | "all" | "this") => void
  sidebarMaterials: Material[]
  groupedByExamPart: { label: string; items: Material[] }[]
  groupedByCategory: Record<string, Material[]> | null
  categoryName: string
  hasAssets: boolean
  subjectId: string
  materialId: string
  assetFromUrl: number
  offline?: boolean
  onItemClick?: () => void
}

export function SidebarContent({
  sidebarMode,
  setSidebarMode,
  sidebarMaterials,
  groupedByExamPart,
  groupedByCategory,
  categoryName,
  hasAssets,
  subjectId,
  materialId,
  assetFromUrl,
  offline,
  onItemClick,
}: SidebarContentProps) {
  const { t } = useI18n()

  const modeBtnClass = (active: boolean) =>
    `rounded-full border px-2.5 py-1 text-[0.688rem] transition-all duration-100 cursor-pointer ${
      active
        ? "border-[var(--accent)] bg-[var(--accent-bg)] text-[var(--accent-strong)] font-medium"
        : "border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
    }`

  return (
    <>
      <div className="flex items-center gap-1.5 px-3 py-2.5">
        {hasAssets && (
          <button
            onClick={() => setSidebarMode("this")}
            className={modeBtnClass(sidebarMode === "this")}
          >
            {t("viewer.sidebar_this")}
          </button>
        )}
        <button
          onClick={() => setSidebarMode("category")}
          className={modeBtnClass(sidebarMode === "category")}
        >
          {categoryName}
        </button>
        <button
          onClick={() => setSidebarMode("all")}
          className={modeBtnClass(sidebarMode === "all")}
        >
          {t("viewer.sidebar_all")}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2" onClick={onItemClick}>
        {sidebarMode === "this"
          ? sidebarMaterials.map((m) => (
              <div key={m.id}>
                <SidebarItem
                  material={m}
                  isActive={m.id === materialId}
                  offline={offline}
                  onItemClick={onItemClick}
                />
                {m.assets.length > 0 && (
                  <div className="flex flex-col gap-0.5 pb-1">
                    {m.assets.map((a, i) => {
                      const AssetIcon = typeIconMap[a.fileType] || FileImage
                      const ts = typeTagStyles[a.fileType]
                      const isCurrentAsset = m.id === materialId && assetFromUrl === i + 1
                      return (
                        <Link
                          key={a.id}
                          to="/subjects/$subjectId/materials/$materialId"
                          params={{ subjectId, materialId }}
                          search={{ asset: String(i + 1) }}
                          className={`flex items-center gap-2 rounded-[0.438rem] px-2.5 py-1.5 transition-colors duration-100 hover:bg-[var(--bg-subtle)] ${isCurrentAsset ? "bg-[var(--nav-active-bg)]" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            onItemClick?.()
                          }}
                        >
                          <div
                            className={`flex size-5 shrink-0 items-center justify-center rounded-[0.25rem] ${ts?.container || "text-[var(--text-hint)]"}`}
                          >
                            <AssetIcon
                              className={`size-3 ${ts?.icon || "text-[var(--text-hint)]"}`}
                            />
                          </div>
                          <span
                            className={`truncate text-[0.688rem] font-medium leading-snug ${isCurrentAsset ? "text-[var(--accent-strong)]" : "text-[var(--text-primary)]"}`}
                          >
                            {a.name}
                          </span>
                          <span className="shrink-0 inline-block px-1.5 py-[0.063rem] rounded-full text-[0.563rem] font-medium leading-snug">
                            {t(`materialType.${a.fileType}`) || a.fileType}
                          </span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            ))
          : sidebarMode === "category"
            ? groupedByExamPart.map((section) => (
                <div key={section.label || "__default"}>
                  {section.label && (
                    <div className="px-2.5 pb-1 pt-2.5 text-[0.688rem] font-semibold uppercase tracking-[0.05rem] text-[var(--text-hint)]">
                      {section.label}
                    </div>
                  )}
                  {section.items.map((m) => (
                    <div key={m.id}>
                      <SidebarItem
                        material={m}
                        isActive={m.id === materialId}
                        offline={offline}
                        onItemClick={onItemClick}
                      />
                      {(m.assets?.length ?? m.assetCount ?? 0) > 0 && (
                        <ExpandableAssets
                          assets={m.assets}
                          subjectId={m.subjectId}
                          materialId={m.id}
                          assetCount={m.assets?.length ?? m.assetCount ?? 0}
                          compact
                          currentAssetIndex={m.id === materialId ? assetFromUrl : undefined}
                        />
                      )}
                    </div>
                  ))}
                </div>
              ))
            : groupedByCategory &&
              CATEGORY_ORDER.filter((cat) => groupedByCategory[cat]).map((cat) => (
                <div key={cat}>
                  <div className="px-2.5 pb-1 pt-2.5 text-[0.688rem] font-semibold uppercase tracking-[0.05rem] text-[var(--text-hint)]">
                    {cat === "final" ? t("category.exam") : t(`category.${cat}`)}
                  </div>
                  {groupedByCategory[cat].map((m) => (
                    <div key={m.id}>
                      <SidebarItem
                        material={m}
                        isActive={m.id === materialId}
                        offline={offline}
                        onItemClick={onItemClick}
                      />
                      {(m.assets?.length ?? m.assetCount ?? 0) > 0 && (
                        <ExpandableAssets
                          assets={m.assets}
                          subjectId={m.subjectId}
                          materialId={m.id}
                          assetCount={m.assets?.length ?? m.assetCount ?? 0}
                          compact
                          currentAssetIndex={m.id === materialId ? assetFromUrl : undefined}
                        />
                      )}
                    </div>
                  ))}
                </div>
              ))}
      </div>
    </>
  )
}

function SidebarItem({
  material,
  isActive,
  offline,
  onItemClick,
}: {
  material: Material
  isActive: boolean
  offline?: boolean
  onItemClick?: () => void
}) {
  const { t } = useI18n()
  const Icon = typeIconMap[material.fileType] || FileText
  const ts = typeTagStyles[material.fileType]
  const badge = typeBadgeStyles[material.fileType]
  return (
    <Link
      to="/subjects/$subjectId/materials/$materialId"
      params={{ subjectId: material.subjectId, materialId: material.id }}
      search={{}}
      resetScroll={false}
      onClick={() => onItemClick?.()}
      className={`flex items-center gap-2 rounded-[0.438rem] px-2.5 py-1.5 text-left transition-colors duration-100 ${isActive ? "bg-[var(--nav-active-bg)] text-[var(--nav-active-text)]" : "hover:bg-[var(--bg-subtle)]"}`}
    >
      <div
        className={`flex size-6 shrink-0 items-center justify-center rounded-[0.313rem] border ${ts?.container || "border-[var(--border-default)] bg-[var(--bg-subtle)]"}`}
      >
        <Icon className={`size-3 ${ts?.icon || "text-[var(--text-hint)]"}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div
          className={`truncate text-[0.75rem] font-medium leading-snug ${isActive ? "text-[var(--nav-active-text)]" : "text-[var(--text-primary)]"}`}
        >
          {material.title}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span
            className={`inline-block px-1.5 py-[0.063rem] rounded-full text-[0.563rem] font-medium leading-snug ${badge || "bg-[var(--bg-subtle)] text-[var(--text-secondary)]"}`}
          >
            {t(`materialType.${material.fileType}`) || material.fileType}
          </span>
          {offline && <OfflineBadge size="xs" />}
        </div>
      </div>
      <span onClick={(e) => e.preventDefault()} className="shrink-0">
        <BookmarkButton id={material.id} size="size-5" />
      </span>
    </Link>
  )
}
