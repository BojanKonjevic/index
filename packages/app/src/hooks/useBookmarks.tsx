import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react"
import { useAuth } from "@/hooks/useAuth"
import { fetchApi } from "@/lib/api"

interface BookmarkContextValue {
  bookmarks: string[]
  addBookmark: (id: string) => Promise<void>
  removeBookmark: (id: string) => Promise<void>
  isBookmarked: (id: string) => boolean
}

const BookmarkContext = createContext<BookmarkContextValue | null>(null)

function persistBookmarks(ids: string[]) {
  localStorage.setItem("bookmarks", JSON.stringify(ids))
}

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
  const bookmarksRef = useRef(bookmarks)
  useEffect(() => {
    bookmarksRef.current = bookmarks
  }, [bookmarks])
  const fetchRef = useRef(0)

  useEffect(() => {
    if (!user?.id) return
    const thisFetch = ++fetchRef.current
    fetchApi<{ ids: string[] }>("/bookmarks")
      .then((data) => {
        if (thisFetch !== fetchRef.current) return
        setBookmarks(data.ids)
        persistBookmarks(data.ids)
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

  const addBookmark = useCallback(
    async (id: string) => {
      if (bookmarksRef.current.includes(id)) return
      const next = [...bookmarksRef.current, id]
      setBookmarks(next)
      persistBookmarks(next)
      if (user) {
        try {
          await fetchApi("/bookmarks/add", {
            method: "POST",
            body: JSON.stringify({ materialId: id }),
          })
        } catch (e) {
          const rollback = bookmarksRef.current.filter((b) => b !== id)
          setBookmarks(rollback)
          persistBookmarks(rollback)
          console.error("Failed to add bookmark:", e)
        }
      }
    },
    [user],
  )

  const removeBookmark = useCallback(
    async (id: string) => {
      const next = bookmarksRef.current.filter((b) => b !== id)
      setBookmarks(next)
      persistBookmarks(next)
      if (user) {
        try {
          await fetchApi("/bookmarks/remove", {
            method: "POST",
            body: JSON.stringify({ materialId: id }),
          })
        } catch (e) {
          const rollback = [...bookmarksRef.current, id]
          setBookmarks(rollback)
          persistBookmarks(rollback)
          console.error("Failed to remove bookmark:", e)
        }
      }
    },
    [user],
  )

  const isBookmarked = useCallback((id: string) => bookmarksRef.current.includes(id), [])

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
