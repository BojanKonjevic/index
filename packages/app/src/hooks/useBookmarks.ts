import { useState, useEffect, useCallback } from "react"

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<string[]>(() => {
    if (typeof window === "undefined") return []
    const stored = localStorage.getItem("bookmarks")
    return stored ? JSON.parse(stored) : []
  })

  useEffect(() => {
    localStorage.setItem("bookmarks", JSON.stringify(bookmarks))
  }, [bookmarks])

  const addBookmark = useCallback((id: string) => {
    setBookmarks((prev) => (prev.includes(id) ? prev : [...prev, id]))
  }, [])

  const removeBookmark = useCallback((id: string) => {
    setBookmarks((prev) => prev.filter((b) => b !== id))
  }, [])

  const isBookmarked = useCallback((id: string) => bookmarks.includes(id), [bookmarks])

  return { bookmarks, addBookmark, removeBookmark, isBookmarked }
}
