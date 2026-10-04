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
  /** Display order: skripte first, sittings in study order, final last. */
  order: number
}

const SITTING_ORDER = 4

const GROUP_DEFS: Record<string, { labelKey: string; icon: typeof BookOpen; order: number }> = {
  misc: { labelKey: "category.misc", icon: Folder, order: 0 },
  theory: { labelKey: "category.theory", icon: BookOpen, order: 1 },
  problems: { labelKey: "category.problems", icon: Pencil, order: 2 },
  exam: { labelKey: "category.exam", icon: FileText, order: 3 },
  final: { labelKey: "category.exam", icon: FileText, order: 5 },
}

/** One descriptor per subject-page group. Exam sittings share one shape
 *  (translated label when known, raw part fallback); only the
 *  fixed shelves differ. */
export function describeGroup(key: string, t: (k: string) => string): GroupDef {
  const def = GROUP_DEFS[key]
  if (def) {
    return { label: t(def.labelKey), icon: def.icon, order: def.order }
  }
  const v = t(`category.${key}`)
  return {
    label: v === `category.${key}` ? key.toUpperCase() : v,
    icon: FileText,
    order: SITTING_ORDER,
  }
}

/** Display order for subject page groups. Unknown future parts sort
 *  naturally among the sittings. */
export function sortGroupKeys(keys: string[]): string[] {
  const rank = (k: string): [number, string] =>
    k in GROUP_DEFS ? [GROUP_DEFS[k].order, ""] : [SITTING_ORDER, k]
  return [...keys].sort((a, b) => {
    const [ra, sa] = rank(a)
    const [rb, sb] = rank(b)
    if (ra !== rb) return ra - rb
    return sa.localeCompare(sb, "sr", { numeric: true })
  })
}
