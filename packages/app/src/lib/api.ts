import type {
  SubjectListItem,
  SubjectDetail,
  DashboardData,
  Material,
  MaterialAsset,
  SearchContentParams,
  SearchContentResponse,
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

  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers, credentials: "include" })
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

export class SearchAbortedError extends Error {
  constructor() {
    super("Search request aborted")
    this.name = "AbortError"
  }
}

/** Monotonic sequence guard: a response whose seq predates the last applied
 *  response is stale and must be dropped. Belt-and-suspenders for the case
 *  where abort fires too late to prevent an in-flight response from landing. */
export class SearchSequenceGuard {
  private lastIssued = 0
  private lastApplied = 0

  beginRequest(): number {
    return ++this.lastIssued
  }

  shouldApply(seq: number): boolean {
    if (seq < this.lastApplied) return false
    this.lastApplied = seq
    return true
  }
}

export async function searchContent(
  params: SearchContentParams,
  signal?: AbortSignal,
): Promise<SearchContentResponse> {
  if (signal?.aborted) throw new SearchAbortedError()

  const query = new URLSearchParams()
  query.set("q", params.q)
  query.set("scope", params.scope)
  if (params.subjectId) query.set("subjectId", params.subjectId)
  if (params.materialId) query.set("materialId", params.materialId)
  if (params.includeOcr) query.set("includeOcr", "1")
  query.set("limit", String(params.limit ?? 20))
  query.set("offset", String(params.offset ?? 0))

  try {
    return await fetchApi(`/search?${query.toString()}`, { signal })
  } catch (err) {
    if (signal?.aborted || (err instanceof Error && err.name === "AbortError")) {
      throw new SearchAbortedError()
    }
    throw err
  }
}
