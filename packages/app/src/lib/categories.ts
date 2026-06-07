import type { Material } from "@index/shared"

export function getVirtualCategory(m: Material): string {
  if (m.category === "exam" && m.examPart) {
    return m.examPart.toLowerCase()
  }
  return m.category
}
