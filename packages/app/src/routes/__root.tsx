import { createRootRoute, Outlet, Link, useLocation } from "@tanstack/react-router"
import { Home, BookOpen, Bookmark, Settings, User, GraduationCap, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { useState } from "react"

const groups = Array.from({ length: 14 }, (_, i) => i + 1)

function getGroup(): number {
  if (typeof window === "undefined") return 7
  return Number(localStorage.getItem("group")) || 7
}

function Sidebar() {
  const location = useLocation()
  const [group, setGroup] = useState(getGroup)

  const navSections = [
    {
      label: "Navigacija",
      items: [
        { to: "/", label: "Početna", icon: Home },
        { to: "/subjects", label: "Predmeti", icon: BookOpen },
      ],
    },
    {
      label: "Lično",
      items: [
        { to: "/bookmarks", label: "Obeleženo", icon: Bookmark },
        { to: "/settings", label: "Podešavanja", icon: Settings },
      ],
    },
  ]

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-56 flex-col border-r bg-white">
      <div className="border-b border-[#f0f0f0] px-5 py-[18px] pb-[14px]">
        <Link to="/" className="flex items-center gap-2">
          <GraduationCap className="size-5" />
          <span className="text-[17px] font-bold tracking-tight">Indeks</span>
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-2 py-2.5">
        {navSections.map((section) => (
          <div key={section.label}>
            <div className="px-3 pb-1 pt-3 text-[10.5px] font-semibold uppercase tracking-[0.8px] text-[#bbb]">
              {section.label}
            </div>
            {section.items.map((item) => {
              const isActive =
                item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to)
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-3 py-2 text-[13.5px] transition-colors",
                    isActive
                      ? "bg-[#111] text-white"
                      : "text-[#444] hover:bg-[#f5f5f4] hover:text-[#111]",
                  )}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-[#f0f0f0] px-2 py-3">
        <div className="flex items-center gap-2 rounded-md bg-[#f5f5f4] px-3 py-2">
          <User className="size-4 text-[#888]" />
          <div className="flex-1">
            <div className="text-xs text-[#888]">Trenutna grupa</div>
            <div className="flex items-center gap-1">
              <Select
                value={String(group)}
                onValueChange={(v) => {
                  if (!v) return
                  setGroup(Number(v))
                  localStorage.setItem("group", v)
                }}
              >
                <SelectTrigger className="h-6 border-none bg-transparent p-0 text-[13px] font-medium shadow-none focus:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((g) => (
                    <SelectItem key={g} value={String(g)}>
                      Grupa {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <ChevronDown className="size-3.5 text-[#bbb]" />
        </div>
      </div>
    </aside>
  )
}

function TopBar() {
  const group = getGroup()

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex h-12 items-center justify-between border-b bg-white px-6">
      <span className="text-base font-bold tracking-tight">Indeks</span>
      <div className="flex items-center gap-4 text-[13px] text-[#555]">
        <Link to="/subjects" className="hover:text-[#111]">
          Predmeti
        </Link>
        <span className="rounded bg-[#f0f0f0] px-2 py-0.5 text-xs font-medium">Grupa {group}</span>
        <Link to="/settings" className="hover:text-[#111]">
          <Settings className="size-4" />
        </Link>
      </div>
    </header>
  )
}

export const Route = createRootRoute({
  component: () => {
    const location = useLocation()
    const isHome = location.pathname === "/"
    const isViewer = location.pathname.includes("/materials/")

    if (isViewer) {
      return (
        <div className="min-h-screen">
          <Outlet />
        </div>
      )
    }

    return (
      <div className="min-h-screen bg-[#f5f5f4]">
        {isHome ? (
          <>
            <TopBar />
            <main className="pt-12">
              <Outlet />
            </main>
          </>
        ) : (
          <>
            <Sidebar />
            <main className="ml-56 min-h-screen p-8">
              <Outlet />
            </main>
          </>
        )}
      </div>
    )
  },
})
