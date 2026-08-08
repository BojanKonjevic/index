import { findAll, makeSnippet, normalizeSr } from "@index/shared"
import type { SearchContentItem, SearchContentPage } from "@index/shared"
import type { OfflineSubjectRecord } from "./db"

export interface OfflineSearchResult extends SearchContentItem {
  offline: true
}

export interface OfflineSearchOptions {
  /** Restrict scanning to a single subject. */
  subjectId?: string
  /** Restrict scanning to a single material. */
  materialId?: string
  /**
   * Scan-cost bound: stop starting new subjects once hits were found in more
   * than this many subjects. Defaults to 2: a linear scan of a few subjects'
   * page text per keystroke, never the whole downloaded corpus.
   */
  maxMatchedSubjects?: number
  /** Max pages with snippets to include per material. */
  maxPagesPerMaterial?: number
  /** Max materials to return. */
  limit?: number
}

interface MaterialAccumulator {
  materialId: string
  subjectId: string
  subjectName: string
  title: string
  fileType: "pdf" | "video" | "image"
  hits: number
  firstPage: number
  pages: SearchContentPage[]
}

export function searchOfflinePages(
  bundles: OfflineSubjectRecord[],
  query: string,
  options: OfflineSearchOptions = {},
): OfflineSearchResult[] {
  const q = query.trim()
  if (q.length < 2 || !normalizeSr(q)) return []

  const {
    subjectId,
    materialId,
    maxMatchedSubjects = 2,
    maxPagesPerMaterial = 3,
    limit = 20,
  } = options

  const items: OfflineSearchResult[] = []
  let matchedSubjects = 0

  for (const bundle of bundles) {
    if (bundle.status !== "complete") continue
    if (subjectId && bundle.subjectId !== subjectId) continue
    if (matchedSubjects >= maxMatchedSubjects) break

    const materials = bundle.payload.materials
    const byMaterial = new Map<string, MaterialAccumulator>()
    let subjectMatched = false

    for (const page of bundle.payload.pages) {
      if (materialId && page.materialId !== materialId) continue

      const material = materials.find((m) => m.id === page.materialId)
      if (!material) continue

      const matches = findAll(page.text, q)
      if (matches.length === 0) continue

      let acc = byMaterial.get(material.id)
      if (!acc) {
        acc = {
          materialId: material.id,
          subjectId: bundle.subjectId,
          subjectName: bundle.payload.subject.name,
          title: material.title,
          fileType: material.fileType,
          hits: 0,
          firstPage: Number.MAX_SAFE_INTEGER,
          pages: [],
        }
        byMaterial.set(material.id, acc)
      }
      acc.hits += matches.length
      acc.firstPage = Math.min(acc.firstPage, page.pageNumber)
      acc.pages.push({ page: page.pageNumber, snippet: makeSnippet(page.text, q, 80) })
    }

    for (const acc of byMaterial.values()) {
      subjectMatched = true
      acc.pages.sort((a, b) => a.page - b.page)
      if (acc.pages.length > maxPagesPerMaterial) {
        acc.pages = acc.pages.slice(0, maxPagesPerMaterial)
      }
      items.push({ ...acc, offline: true })
      if (items.length >= limit) break
    }
    if (subjectMatched) matchedSubjects += 1
    if (items.length >= limit) break
  }

  return items
}
