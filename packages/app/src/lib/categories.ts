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
 *  fixed shelves differ. */
export function describeGroup(key: string, t: (k: string) => string): GroupDef {
  switch (key) {
    case "misc":
      return { label: t("category.misc"), icon: Folder, split: false, order: 0 }
    case "theory":
      return { label: t("category.theory"), icon: BookOpen, split: false, order: 1 }
    case "problems":
      return { label: t("category.problems"), icon: Pencil, split: true, order: 2 }
    case "exam":
      return { label: t("category.exam"), icon: FileText, split: true, order: 3 }
    case "final":
      return { label: t("category.exam"), icon: FileText, split: true, order: 5 }
    default: {
      const v = t(`category.${key}`)
      return {
        label: v === `category.${key}` ? key.toUpperCase() : v,
        icon: FileText,
        split: true,
        order: 4,
      }
    }
  }
}

/** Display order for subject page groups. Unknown future parts sort
 *  naturally among the sittings. */
export function sortGroupKeys(keys: string[]): string[] {
  const orderOf = (k: string): [number, string] => {
    if (k === "misc") return [0, ""]
    if (k === "theory") return [1, ""]
    if (k === "problems") return [2, ""]
    if (k === "exam") return [3, ""]
    if (k === "final") return [5, ""]
    return [4, k]
  }
  return [...keys].sort((a, b) => {
    const [ra, sa] = orderOf(a)
    const [rb, sb] = orderOf(b)
    if (ra !== rb) return ra - rb
    return sa.localeCompare(sb, "sr", { numeric: true })
  })
}
