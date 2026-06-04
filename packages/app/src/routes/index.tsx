import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { Search, FileText, BookOpen, Calendar } from "lucide-react"
import { fetchSubject } from "@/lib/api"
import { useRecentlyOpened } from "@/hooks/useRecentlyOpened"
import { useDebounce } from "@/hooks/useDebounce"
import { useGlobalSearch } from "@/lib/search"
import { formatDate, daysUntil, getRelativeTime } from "@/lib/utils"
import type { ExamEvent } from "@index/shared"
import { useState, useRef, useEffect } from "react"

function getUrgency(days: number) {
  if (days <= 0) return { cls: "soon" as const, label: "danas" }
  if (days === 1) return { cls: "soon" as const, label: "sutra" }
  if (days <= 14) return { cls: "soon" as const, label: `za ${days} dana` }
  if (days <= 30) return { cls: "upcoming" as const, label: `za ${days} dana` }
  return { cls: "later" as const, label: `za ${days} dana` }
}

function ExamCard({ exam, subjectName }: { exam: ExamEvent; subjectName: string }) {
  const days = daysUntil(exam.date)
  const urgency = getUrgency(days)
  const colorMap: Record<string, string> = {
    soon: "bg-red-50 text-red-600",
    upcoming: "bg-amber-50 text-amber-600",
    later: "bg-green-50 text-green-600",
  }

  return (
    <Link
      to="/subjects/$subjectId"
      params={{ subjectId: exam.subjectId }}
      className="flex items-center justify-between rounded-md border bg-white px-3 py-2.5 transition-colors hover:bg-[#fafafa]"
    >
      <div className="flex flex-col gap-0.5">
        <span className="text-[13.5px] font-medium">{subjectName}</span>
        <span className="text-xs text-[#666]">{exam.title}</span>
      </div>
      <div className="text-right">
        <div className="text-[13px] font-medium">{formatDate(exam.date)}</div>
        <span
          className={`inline-block rounded-full px-1.5 py-0.5 text-[11px] font-medium ${colorMap[urgency.cls]}`}
        >
          {urgency.label}
        </span>
      </div>
    </Link>
  )
}

export const Route = createFileRoute("/")({
  loader: async () => {
    try {
      return await fetchSubject("matematicka-analiza-2")
    } catch {
      return null
    }
  },
  component: HomePage,
})

function HomePage() {
  const data = Route.useLoaderData()
  const { recent } = useRecentlyOpened()
  const group = typeof window !== "undefined" ? (localStorage.getItem("group") ?? "7") : "7"
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debouncedQuery = useDebounce(searchQuery, 200)

  const searchData = data
    ? {
        subjects: [
          {
            id: data.subject.id,
            name: data.subject.name,
            semester: data.subject.semester,
            espb: data.subject.espb,
          },
        ],
        materials: data.materials,
        exams: data.exams,
        subjectName: data.subject.name,
      }
    : null

  const results = useGlobalSearch(searchData, debouncedQuery)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== inputRef.current) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [])

  const exams = data?.exams ?? []

  return (
    <div className="mx-auto max-w-[560px] px-6 pb-16 pt-[100px]">
      <h1 className="mb-1 text-[22px] font-semibold tracking-tight">Dobar dan.</h1>
      <p className="mb-5 text-[13px] text-[#666]">4. semestar · 1 predmet · Grupa {group}</p>

      <div className="relative mb-12" ref={searchRef}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#999]" />
          <input
            ref={inputRef}
            type="search"
            placeholder="Pretraži predmete, materijale, ispite…"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setIsOpen(true)
              setSelectedIndex(0)
            }}
            onFocus={() => {
              if (searchQuery.trim()) setIsOpen(true)
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault()
                setSelectedIndex((i) => Math.min(i + 1, results.length - 1))
              } else if (e.key === "ArrowUp") {
                e.preventDefault()
                setSelectedIndex((i) => Math.max(i - 1, 0))
              } else if (e.key === "Enter" && results[selectedIndex]) {
                const r = results[selectedIndex]
                navigate({ to: r.to, params: r.params })
                setIsOpen(false)
                setSearchQuery("")
              } else if (e.key === "Escape") {
                setIsOpen(false)
                inputRef.current?.blur()
              }
            }}
            className="h-[42px] w-full rounded-lg border-[1.5px] border-[#d4d4d4] bg-[#fafafa] pl-10 pr-4 text-sm outline-none transition-colors focus:border-[#111] focus:bg-white"
          />
        </div>

        {isOpen && results.length > 0 && (
          <div className="absolute left-0 right-0 top-[48px] z-50 rounded-lg border border-[#e0e0e0] bg-white py-1 shadow-lg">
            {results.map((r, i) => (
              <button
                key={r.id}
                onClick={() => {
                  navigate({ to: r.to, params: r.params })
                  setIsOpen(false)
                  setSearchQuery("")
                }}
                onMouseEnter={() => setSelectedIndex(i)}
                className={`flex w-full items-center gap-3 px-3 py-2 text-left text-[13px] transition-colors ${
                  i === selectedIndex ? "bg-[#f5f5f5]" : ""
                }`}
              >
                <div className="flex size-7 shrink-0 items-center justify-center rounded bg-[#f0f0f0]">
                  {r.type === "subject" ? (
                    <BookOpen className="size-3.5 text-[#888]" />
                  ) : r.type === "material" ? (
                    <FileText className="size-3.5 text-[#888]" />
                  ) : (
                    <Calendar className="size-3.5 text-[#888]" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{r.label}</div>
                  <div className="truncate text-xs text-[#888]">{r.description}</div>
                </div>
                <span className="shrink-0 text-[11px] text-[#bbb] capitalize">{r.type}</span>
              </button>
            ))}
          </div>
        )}

        <p className="mt-2 text-xs text-[#999]">
          Pritisni{" "}
          <kbd className="rounded border bg-[#f0f0f0] px-1 py-0.5 text-[11px] text-[#888]">/</kbd>{" "}
          za brzu pretragu
        </p>
      </div>

      <section className="mb-9">
        <div className="mb-3 flex items-baseline justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[0.8px] text-[#999]">
            Predstojeći ispiti
          </span>
          {exams.length > 0 && (
            <Link
              to="/subjects/$subjectId"
              params={{ subjectId: "matematicka-analiza-2" }}
              className="text-xs text-[#555] hover:text-[#111]"
            >
              Svi →
            </Link>
          )}
        </div>
        <div className="flex flex-col gap-0.5">
          {exams.length > 0 ? (
            exams.map((exam) => (
              <ExamCard key={exam.id} exam={exam} subjectName={data!.subject.name} />
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Ništa zakazano.</p>
          )}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[0.8px] text-[#999]">
            Nedavno otvoreno
          </span>
        </div>
        {recent.length > 0 ? (
          <div className="flex flex-col gap-0.5">
            {recent.map((item) => (
              <Link
                key={item.materialId}
                to="/subjects/$subjectId/materials/$materialId"
                params={{ subjectId: item.subjectId, materialId: item.materialId }}
                className="flex items-center gap-2.5 rounded-md px-3 py-2 transition-colors hover:bg-[#fafafa]"
              >
                <div className="flex size-7 shrink-0 items-center justify-center rounded bg-[#f0f0f0]">
                  <FileText className="size-3.5 text-[#888]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-medium">{item.title}</div>
                  <div className="text-xs text-[#888]">{item.subjectName}</div>
                </div>
                <span className="shrink-0 text-xs text-[#bbb]">
                  {getRelativeTime(item.timestamp)}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Još uvek ništa niste otvorili.</p>
        )}
      </section>
    </div>
  )
}
