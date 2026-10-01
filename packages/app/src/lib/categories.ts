import { BookOpen, FileText, Folder, Pencil } from "lucide-react"
import type { Material } from "@index/shared"

export function getVirtualCategory(m: Material): string {
  if (m.category === "exam" && m.examPart) {
    return m.examPart.toLowerCase()
  }
  if (m.category === "misc" && m.examPart) {
    return m.examPart.toLowerCase()
  }
  return m.category
}

export interface GroupDef {
  label: string
  icon: typeof BookOpen
  /** Whether the solved/unsolved/unknown split earns its keep here. */
  split: boolean
  /** Display order: skripte first, sittings in study order, final last. */
  order: number
}

/** One descriptor per subject-page group. Exam sittings share one shape
 *  (translated label when known, raw part fallback, split on); only the
 *  fixed shelves differ. Order comes from GROUP_ORDER. */
export function describeGroup(key: string, t: (k: string) => string): GroupDef {
  switch (key) {
    case "misc":
      return { label: t("category.misc"), icon: Folder, split: false, order: GROUP_ORDER.misc }
    case "theory":
      return {
        label: t("category.theory"),
        icon: BookOpen,
        split: false,
        order: GROUP_ORDER.theory,
      }
    case "problems":
      return {
        label: t("category.problems"),
        icon: Pencil,
        split: true,
        order: GROUP_ORDER.problems,
      }
    case "exam":
      return { label: t("category.exam"), icon: FileText, split: true, order: GROUP_ORDER.exam }
    case "final":
      return { label: t("category.exam"), icon: FileText, split: true, order: GROUP_ORDER.final }
    default: {
      const v = t(`category.${key}`)
      return {
        label: v === `category.${key}` ? key.toUpperCase() : v,
        icon: FileText,
        split: true,
        order: SITTING_ORDER,
      }
    }
  }
}

/** Display order for subject page groups. Skripte first (cover to cover
 *  exam reading), then theory and problems, then sittings in study order
 *  with the generic exam pile on top and the final last. Unknown future
 *  parts sort naturally among the sittings. */
const GROUP_ORDER: Record<string, number> = {
  misc: 0,
  theory: 1,
  problems: 2,
  exam: 3,
  final: 5,
}

/** Rank for exam sittings and any future part. */
const SITTING_ORDER = 4

export function sortGroupKeys(keys: string[]): string[] {
  const rank = (k: string): [number, string] =>
    k in GROUP_ORDER ? [GROUP_ORDER[k], ""] : [SITTING_ORDER, k]
  return [...keys].sort((a, b) => {
    const [ra, sa] = rank(a)
    const [rb, sb] = rank(b)
    if (ra !== rb) return ra - rb
    return sa.localeCompare(sb, "sr", { numeric: true })
  })
}
