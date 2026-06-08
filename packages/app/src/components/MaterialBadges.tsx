import type { Material } from "@index/shared"
import { useI18n } from "@/hooks/useI18n"
import { typeBadgeStyles, categoryBadgeStyles } from "@/lib/styles"
import { getVirtualCategory } from "@/lib/categories"

interface Props {
  material: Pick<Material, "fileType" | "category" | "examPart" | "solved">
  size?: "sm" | "xs"
}

export function MaterialBadges({ material, size = "sm" }: Props) {
  const { t } = useI18n()
  const vcat = getVirtualCategory(material as Material)
  const cls =
    size === "xs"
      ? "inline-block px-[0.438rem] py-[0.125rem] rounded-full text-[0.563rem] font-medium"
      : "inline-block px-[0.438rem] py-[0.125rem] rounded-full text-[0.688rem] font-medium"

  return (
    <>
      <span
        className={`${cls} ${typeBadgeStyles[material.fileType] ?? "bg-[var(--bg-subtle)] text-[var(--text-secondary)]"}`}
      >
        {t(`materialType.${material.fileType}`)}
      </span>
      <span
        className={`${cls} ${categoryBadgeStyles[vcat] ?? "bg-[var(--bg-subtle)] text-[var(--text-secondary)]"}`}
      >
        {vcat === "final" ? t("category.exam") : t(`category.${vcat}`)}
      </span>
      {material.examPart && vcat !== material.examPart.toLowerCase() && (
        <span className={`${cls} bg-[var(--bg-subtle)] text-[var(--text-secondary)]`}>
          {material.examPart}
        </span>
      )}
      {material.solved === true && (
        <span className={`${cls} bg-[var(--status-later-bg)] text-[var(--status-later-text)]`}>
          {t("subject.solved_badge")}
        </span>
      )}
      {material.solved === false && (
        <span className={`${cls} bg-[var(--accent-bg)] text-[var(--accent-strong)]`}>
          {t("subject.unsolved_badge")}
        </span>
      )}
    </>
  )
}
