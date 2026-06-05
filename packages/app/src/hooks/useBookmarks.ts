import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/hooks/useAuth"

export function useBookmarks() {
  const { user } = useAuth()
  const [bookmarks, setBookmarks] = useState<string[]>(() => {
    const stored = localStorage.getItem("bookmarks")
    return stored ? JSON.parse(stored) : []
  })

  useEffect(() => {
    if (!user) return
    fetch("/api/bookmarks")
      .then((r) => r.json())
      .then((data) => {
        if (data.ids) {
          const local: string[] = JSON.parse(localStorage.getItem("bookmarks") || "[]")
          const merged = [...new Set([...data.ids, ...local])]
          setBookmarks(merged)
          localStorage.setItem("bookmarks", JSON.stringify(merged))
        }
      })
      .catch(() => {
        const stored = localStorage.getItem("bookmarks")
        if (stored) setBookmarks(JSON.parse(stored))
      })
  }, [user])

  const addBookmark = useCallback(
    async (id: string) => {
      setBookmarks((prev) => {
        if (prev.includes(id)) return prev
        const next = [...prev, id]
        localStorage.setItem("bookmarks", JSON.stringify(next))
        return next
      })
      if (user) {
        await fetch("/api/bookmarks/add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ materialId: id }),
        }).catch(() => {})
      }
    },
    [user],
  )

  const removeBookmark = useCallback(
    async (id: string) => {
      setBookmarks((prev) => {
        const next = prev.filter((b) => b !== id)
        localStorage.setItem("bookmarks", JSON.stringify(next))
        return next
      })
      if (user) {
        await fetch("/api/bookmarks/remove", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ materialId: id }),
        }).catch(() => {})
      }
    },
    [user],
  )

  const isBookmarked = useCallback((id: string) => bookmarks.includes(id), [bookmarks])

  return { bookmarks, addBookmark, removeBookmark, isBookmarked }
}
