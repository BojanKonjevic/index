import { Star } from "lucide-react"
import { useBookmarks } from "@/hooks/useBookmarks"

export function BookmarkButton({ id, size = "size-6" }: { id: string; size?: string }) {
  const { isBookmarked, addBookmark, removeBookmark } = useBookmarks()
  const bookmarked = isBookmarked(id)
  return (
    <button
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        if (bookmarked) removeBookmark(id)
        else addBookmark(id)
      }}
      className="cursor-pointer min-w-[2.75rem] min-h-[2.75rem] flex items-center justify-center"
    >
      <Star
        className={`${size} transition-colors duration-150 ${bookmarked ? "fill-[var(--bookmark)] text-[var(--bookmark)] animate-bookmark-pop" : "text-[var(--text-hint)] hover:text-[var(--text-secondary)]"}`}
      />
    </button>
  )
}
