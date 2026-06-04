import { createFileRoute, Link } from "@tanstack/react-router"
import { Star, FileText, Bookmark } from "lucide-react"
import { fetchSubjects, fetchSubject } from "@/lib/api"
import { useBookmarks } from "@/hooks/useBookmarks"
import { useState, useMemo, useEffect } from "react"

export const Route = createFileRoute("/bookmarks/")({
  loader: async () => {
    const subjects = await fetchSubjects()
    const details = await Promise.all(subjects.map((s) => fetchSubject(s.id)))
    return details
  },
  component: BookmarksPage,
})

function BookmarksPage() {
  const subjectDetails = Route.useLoaderData()
  const { bookmarks, removeBookmark } = useBookmarks()
  const [localBookmarks, setLocalBookmarks] = useState<string[]>(bookmarks)

  useEffect(() => {
    setLocalBookmarks(bookmarks)
  }, [bookmarks])

  const items = useMemo(() => {
    const result: {
      material: (typeof subjectDetails)[0]["materials"][0]
      subjectName: string
      subjectId: string
    }[] = []
    subjectDetails.forEach((detail) => {
      detail.materials.forEach((m) => {
        if (localBookmarks.includes(m.id)) {
          result.push({
            material: m,
            subjectName: detail.subject.name,
            subjectId: detail.subject.id,
          })
        }
      })
    })
    return result.sort((a, b) => a.material.title.localeCompare(b.material.title))
  }, [subjectDetails, localBookmarks])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Obeleženi materijali</h1>
        <p className="mt-0.5 text-[13px] text-[#888]">
          {items.length} {items.length === 1 ? "materijal" : "materijala"}
        </p>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-[#ebebeb] bg-white py-16">
          <Bookmark className="size-10 text-[#ddd]" />
          <p className="text-sm text-muted-foreground">Još uvek nemate obeleženih materijala.</p>
          <Link
            to="/subjects"
            className="rounded-md bg-[#111] px-4 py-2 text-sm font-medium text-white hover:bg-[#333]"
          >
            Pregledaj predmete
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {items.map(({ material, subjectName, subjectId }) => (
            <Link
              key={material.id}
              to="/subjects/$subjectId/materials/$materialId"
              params={{ subjectId, materialId: material.id }}
              className="flex items-center gap-3 rounded-md border border-[#ebebeb] bg-white px-3.5 py-2.5 transition-all hover:border-[#d4d4d4] hover:shadow-sm"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-[#e4e4e4] bg-[#f8f8f8]">
                <FileText className="size-4" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-medium">{material.title}</div>
                <div className="mt-0.5 text-xs text-[#888]">{subjectName}</div>
              </div>

              <div className="shrink-0 text-right">
                <span className="rounded bg-[#f0f0f0] px-2 py-0.5 text-[10px] font-medium text-[#888]">
                  {material.fileType === "pdf" ? "PDF" : "Video"}
                </span>
                {material.pageCount > 0 && (
                  <div className="mt-0.5 text-[11px] text-[#aaa]">{material.pageCount} str.</div>
                )}
              </div>

              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  removeBookmark(material.id)
                }}
                className="shrink-0 cursor-pointer p-1"
              >
                <Star className="size-4 fill-amber-400 text-amber-400 hover:fill-none hover:text-[#ddd]" />
              </button>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
