export interface Subject {
  id: string
  name: string
  semester: number
  espb: number
  elective: boolean
  electiveGroup: string | null
  description: string
  professors: string[]
  assistants: string[]
}

export type MaterialCategory = "theory" | "problems" | "exam" | "misc"
export type VirtualCategory = "k1" | "k2" | "final"
export const CATEGORY_ORDER: (MaterialCategory | VirtualCategory)[] = [
  "theory",
  "problems",
  "k1",
  "k2",
  "final",
  "misc",
]

export interface MaterialAsset {
  id: string
  materialId: string
  pageNumber: number
  name: string
  fileType: "pdf" | "video" | "image"
  url: string
}

export interface Material {
  id: string
  subjectId: string
  title: string
  category: MaterialCategory
  examPart: string | null
  solved: boolean | null
  fileType: "pdf" | "video" | "image"
  url: string
  tags: string[]
  pageCount?: number
  assets: MaterialAsset[]
  assetCount?: number
}

export interface ExamEvent {
  id: string
  subjectId: string
  title: string
  date: string
  time: string
  location: string
}

export interface SubjectListItem {
  id: string
  name: string
  semester: number
  espb: number
  elective: boolean
  electiveGroup: string | null
  professors: string[]
  materialCount: number
}

export interface SubjectDetail {
  subject: Subject
  materials: Material[]
  exams: ExamEvent[]
}

export interface DashboardData {
  subjects: SubjectListItem[]
  materials: Material[]
  exams: ExamEvent[]
  subjectNameMap: Record<string, string>
}

export { buildFtsQuery } from "./ftsQuery"
export {
  findAll,
  makeSnippet,
  normalizeSr,
  normalizeWithMap,
  repairDiacritics,
  srGetFn,
  type NormalizedMap,
} from "./normalize"

export type SearchScope = "global" | "subject" | "material"

export interface SearchContentParams {
  q: string
  scope: SearchScope
  subjectId?: string
  materialId?: string
  includeOcr?: boolean
  limit?: number
  offset?: number
}

export interface SearchContentPage {
  page: number
  snippet: string
}

export interface SearchContentItem {
  materialId: string
  subjectId: string
  subjectName: string
  title: string
  fileType: "pdf" | "video" | "image"
  hits: number
  pages: SearchContentPage[]
}

export interface SearchContentResponse {
  content: {
    total: number
    hasMore: boolean
    items: SearchContentItem[]
  }
}

export interface SearchPagesResult {
  total: number
  pages: Array<{ page: number; count: number }>
}
