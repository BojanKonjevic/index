import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { useAuth } from "@/hooks/useAuth"

function localeHeaders(): Record<string, string> {
  const locale = typeof window !== "undefined" ? localStorage.getItem("locale") : null
  return locale
    ? { "x-locale": locale, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" }
}

interface BookmarkContextValue {
  bookmarks: string[]
  addBookmark: (id: string) => Promise<void>
  removeBookmark: (id: string) => Promise<void>
  isBookmarked: (id: string) => boolean
}

const BookmarkContext = createContext<BookmarkContextValue | null>(null)

export function BookmarkProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [bookmarks, setBookmarks] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("bookmarks")
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
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
        if (stored) {
          try {
            setBookmarks(JSON.parse(stored))
          } catch {}
        }
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

  return (
    <BookmarkContext.Provider value={{ bookmarks, addBookmark, removeBookmark, isBookmarked }}>
      {children}
    </BookmarkContext.Provider>
  )
}

export function useBookmarks() {
  const ctx = useContext(BookmarkContext)
  if (!ctx) throw new Error("useBookmarks must be used within a BookmarkProvider")
  return ctx
}
