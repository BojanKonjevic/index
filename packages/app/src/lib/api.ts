import type { SubjectListItem, SubjectDetail, DashboardData, Material } from "@index/shared"

const API_BASE = import.meta.env.VITE_API_URL || "/api"

export function localeHeaders(extra?: Record<string, string>): Record<string, string> {
  const locale = typeof window !== "undefined" ? localStorage.getItem("locale") : null
  return { "Content-Type": "application/json", ...(locale ? { "x-locale": locale } : {}), ...extra }
}

export async function fetchSubjects(): Promise<SubjectListItem[]> {
  const res = await fetch(`${API_BASE}/subjects`)
  if (!res.ok) throw new Error("Failed to fetch subjects")
  return res.json()
}

export async function fetchSubject(id: string): Promise<SubjectDetail> {
  const res = await fetch(`${API_BASE}/subject/${id}`)
  if (!res.ok) throw new Error("Subject not found")
  return res.json()
}

export async function fetchDashboard(): Promise<DashboardData> {
  const res = await fetch(`${API_BASE}/dashboard`)
  if (!res.ok) throw new Error("Failed to fetch dashboard")
  return res.json()
}

export async function fetchBookmarkedMaterials(): Promise<{
  materials: Material[]
  subjectNameMap: Record<string, string>
}> {
  const res = await fetch(`${API_BASE}/bookmarks/materials`, { headers: localeHeaders() })
  if (!res.ok) throw new Error("Failed to fetch bookmarked materials")
  return res.json()
}
