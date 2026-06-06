import type { SubjectListItem, SubjectDetail, DashboardData } from "@index/shared"

const API_BASE = import.meta.env.VITE_API_URL || "/api"

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
