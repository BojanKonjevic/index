import type { Material } from "@index/shared"

export function getVirtualCategory(m: Material): string {
  if (m.category === "exam" && m.examPart) {
    return m.examPart.toLowerCase()
  }
  return m.category
}

/** Display order for subject page groups. Skripte first (cover to cover
 *  exam reading), then theory and problems, then sittings in study order
 *  with the generic exam pile on top and the final last. Unknown future
 *  parts sort naturally among the sittings. */
export function sortGroupKeys(keys: string[]): string[] {
  const rank = (k: string): [number, string] => {
    if (k === "misc") return [0, ""]
    if (k === "theory") return [1, ""]
    if (k === "problems") return [2, ""]
    if (k === "exam") return [3, ""]
    if (k === "final") return [5, ""]
    return [4, k]
  }
  return [...keys].sort((a, b) => {
    const [ra, sa] = rank(a)
    const [rb, sb] = rank(b)
    if (ra !== rb) return ra - rb
    return sa.localeCompare(sb, "sr", { numeric: true })
  })
}

/** Groups where the solved/unsolved split earns its keep: every exam
 *  sitting plus problems, where zadatak/resenje pairing lives. */
export function splitsSolved(groupKey: string): boolean {
  return groupKey !== "theory" && groupKey !== "misc"
}

/** Translated group label with a raw fallback so a future exam part never
 *  renders as a translation key. */
export function groupLabel(key: string, t: (k: string) => string): string {
  if (key === "final") return t("category.exam")
  const v = t(`category.${key}`)
  return v === `category.${key}` ? key.toUpperCase() : v
}
