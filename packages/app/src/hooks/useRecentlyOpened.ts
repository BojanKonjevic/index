import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/hooks/useAuth"
import { fetchApi } from "@/lib/api"

export interface RecentItem {
  materialId: string
  subjectId: string
  title: string
  subjectName: string
  fileType: string
  category: string
  examPart: string | null
  solved: boolean | null
  assetCount: number
  timestamp: number
}

export function useRecentlyOpened() {
  const { user } = useAuth()
  const [recent, setRecent] = useState<RecentItem[]>(() => {
    if (typeof window === "undefined") return []
    try {
      const stored = localStorage.getItem("recentlyOpened")
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })
  const fetchRef = useRef(0)

  useEffect(() => {
    if (!user?.id) return
    const thisFetch = ++fetchRef.current
    fetchApi<{ items: RecentItem[] }>("/history")
      .then((data) => {
        if (thisFetch !== fetchRef.current) return
        setRecent(data.items)
        localStorage.setItem("recentlyOpened", JSON.stringify(data.items))
      })
      .catch((fetchError) => {
        if (thisFetch !== fetchRef.current) return
        console.error("Failed to fetch history from API:", fetchError)
        const stored = localStorage.getItem("recentlyOpened")
        if (stored) {
          try {
            setRecent(JSON.parse(stored))
          } catch (parseError) {
            console.error("Failed to parse history from localStorage:", parseError)
            setRecent([])
          }
        }
      })
  }, [user?.id])

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
    if (user) {
      fetchApi("/history", {
        method: "POST",
        body: JSON.stringify({ materialId: item.materialId }),
      }).catch((e) => console.error("Failed to sync history:", e))
    }
  }

  return { recent, addRecent }
}
