import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/hooks/useAuth"

function localeHeaders(): Record<string, string> {
  const locale = typeof window !== "undefined" ? localStorage.getItem("locale") : null
  return locale
    ? { "x-locale": locale, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" }
}

export function useBookmarks() {
  const { user } = useAuth()
  const [bookmarks, setBookmarks] = useState<string[]>(() => {
    const stored = localStorage.getItem("bookmarks")
    return stored ? JSON.parse(stored) : []
  })

  useEffect(() => {
    if (!user) return
    fetch("/api/bookmarks", { headers: localeHeaders() })
      .then((r) => r.json())
      .then((data) => {
        if (data.ids) {
          setBookmarks(data.ids)
          localStorage.setItem("bookmarks", JSON.stringify(data.ids))
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
          headers: localeHeaders(),
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
          headers: localeHeaders(),
          body: JSON.stringify({ materialId: id }),
        }).catch(() => {})
      }
    },
    [user],
  )

  const isBookmarked = useCallback((id: string) => bookmarks.includes(id), [bookmarks])

  return { bookmarks, addBookmark, removeBookmark, isBookmarked }
}
