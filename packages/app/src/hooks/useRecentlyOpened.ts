import { useState, useEffect } from "react"

export interface RecentItem {
  materialId: string
  subjectId: string
  title: string
  subjectName: string
  fileType: string
  category: string
  examPart: string | null
  solved: boolean | null
  timestamp: number
}

export function useRecentlyOpened() {
  const [recent, setRecent] = useState<RecentItem[]>(() => {
    if (typeof window === "undefined") return []
    try {
      const stored = localStorage.getItem("recentlyOpened")
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === "recentlyOpened" && e.newValue) {
        try {
          setRecent(JSON.parse(e.newValue))
        } catch {
          // ignore
        }
      }
    }
    window.addEventListener("storage", handler)
    return () => window.removeEventListener("storage", handler)
  }, [])

  const addRecent = (item: RecentItem) => {
    setRecent((prev) => {
      const filtered = prev.filter((r) => r.materialId !== item.materialId)
      const next = [item, ...filtered].slice(0, 20)
      localStorage.setItem("recentlyOpened", JSON.stringify(next))
      return next
    })
  }

  return { recent, addRecent }
}
