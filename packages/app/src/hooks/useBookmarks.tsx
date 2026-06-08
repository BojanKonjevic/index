import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from "react"
import { useAuth } from "@/hooks/useAuth"
import { fetchApi } from "@/lib/api"

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
    } catch (e) {
      console.error("Failed to parse bookmarks from localStorage on init:", e)
      return []
    }
  })
  const fetchRef = useRef(0)

  useEffect(() => {
    if (!user?.id) return
    const thisFetch = ++fetchRef.current
    fetchApi<{ ids: string[] }>("/bookmarks")
      .then((data) => {
        if (thisFetch !== fetchRef.current) return
        setBookmarks(data.ids)
        localStorage.setItem("bookmarks", JSON.stringify(data.ids))
      })
      .catch((fetchError) => {
        if (thisFetch !== fetchRef.current) return
        console.error("Failed to fetch bookmarks from API:", fetchError)
        const stored = localStorage.getItem("bookmarks")
        if (stored) {
          try {
            setBookmarks(JSON.parse(stored))
          } catch (parseError) {
            console.error("Failed to parse bookmarks from localStorage:", parseError)
            setBookmarks([])
          }
        }
      })
  }, [user?.id])

  const addBookmark = async (id: string) => {
    setBookmarks((prev) => {
      if (prev.includes(id)) return prev
      const next = [...prev, id]
      localStorage.setItem("bookmarks", JSON.stringify(next))
      return next
    })
    if (user) {
      try {
        await fetchApi("/bookmarks/add", {
          method: "POST",
          body: JSON.stringify({ materialId: id }),
        })
      } catch (e) {
        setBookmarks((prev) => {
          const next = prev.filter((b) => b !== id)
          localStorage.setItem("bookmarks", JSON.stringify(next))
          return next
        })
        console.error("Failed to add bookmark:", e)
      }
    }
  }

  const removeBookmark = async (id: string) => {
    setBookmarks((prev) => {
      const next = prev.filter((b) => b !== id)
      localStorage.setItem("bookmarks", JSON.stringify(next))
      return next
    })
    if (user) {
      try {
        await fetchApi("/bookmarks/remove", {
          method: "POST",
          body: JSON.stringify({ materialId: id }),
        })
      } catch (e) {
        setBookmarks((prev) => {
          if (prev.includes(id)) return prev
          const next = [...prev, id]
          localStorage.setItem("bookmarks", JSON.stringify(next))
          return next
        })
        console.error("Failed to remove bookmark:", e)
      }
    }
  }

  const isBookmarked = (id: string) => bookmarks.includes(id)

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
