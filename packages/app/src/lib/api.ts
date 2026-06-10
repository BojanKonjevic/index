import type {
  SubjectListItem,
  SubjectDetail,
  DashboardData,
  Material,
  MaterialAsset,
} from "@index/shared"
import { ApiError } from "./api-error"

const API_BASE = import.meta.env.VITE_API_URL || "/api"

export function localeHeaders(extra?: Record<string, string>): Record<string, string> {
  const locale = typeof window !== "undefined" ? localStorage.getItem("locale") : null
  return {
    ...(locale ? { "x-locale": locale } : {}),
    ...extra,
  }
}

export async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = localeHeaders(options.headers as Record<string, string>)
  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json"
  }

  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers })
  const data = await res.json().catch(() => ({}))

  if (!res.ok) throw new ApiError(res.status, data.error || "API Error", data)
  return data as T
}

export async function fetchSubjects(): Promise<SubjectListItem[]> {
  return fetchApi("/subjects")
}

export async function fetchSubject(id: string): Promise<SubjectDetail> {
  return fetchApi(`/subject/${id}`)
}

export async function fetchDashboard(): Promise<DashboardData> {
  return fetchApi("/dashboard")
}

export async function fetchBookmarkedMaterials(): Promise<{
  materials: Material[]
  subjectNameMap: Record<string, string>
}> {
  return fetchApi("/bookmarks/materials")
}

export async function fetchMaterialAssets(id: string): Promise<MaterialAsset[]> {
  return fetchApi(`/material/${id}/assets`)
}
