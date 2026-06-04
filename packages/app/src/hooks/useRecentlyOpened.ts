import { useState, useEffect } from "react"

export interface RecentItem {
  materialId: string
  subjectId: string
  title: string
  subjectName: string
  timestamp: number
}

export function useRecentlyOpened() {
  const [recent, setRecent] = useState<RecentItem[]>(() => {
    if (typeof window === "undefined") return []
    const stored = localStorage.getItem("recentlyOpened")
    return stored ? JSON.parse(stored) : []
  })

  useEffect(() => {
    localStorage.setItem("recentlyOpened", JSON.stringify(recent))
  }, [recent])

  const addRecent = (item: RecentItem) => {
    setRecent((prev) => {
      const filtered = prev.filter((r) => r.materialId !== item.materialId)
      return [item, ...filtered].slice(0, 20)
    })
  }

  return { recent, addRecent }
}
