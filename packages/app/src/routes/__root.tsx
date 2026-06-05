import { createRootRoute, Outlet, Link, useLocation } from "@tanstack/react-router"
import { Home, BookOpen, Bookmark, User, GraduationCap, LogIn, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { useState, useEffect } from "react"
import { AuthProvider, useAuth } from "@/hooks/useAuth"
import { AuthModal } from "@/components/AuthModal"
import { WelcomeScreen } from "@/components/WelcomeScreen"

const groups = Array.from({ length: 14 }, (_, i) => i + 1)

function getGroup(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("group")
}

function Sidebar() {
  const location = useLocation()
  const [group, setGroup] = useState<string | null>(getGroup)
  const { user, isGuest, logout } = useAuth()
  const [authOpen, setAuthOpen] = useState(false)

  useEffect(() => {
    if (!user) return
    fetch("/api/preferences")
      .then((r) => r.json())
      .then((data) => {
        if (data.group) {
          setGroup(data.group)
          localStorage.setItem("group", data.group)
        }
      })
      .catch(() => {})
  }, [user])

  const handleGroupChange = (v: string | null) => {
    if (!v) return
    setGroup(v)
    localStorage.setItem("group", v)
    if (user) {
      fetch("/api/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ group: v }),
      }).catch(() => {})
    }
  }

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
      items: [{ to: "/bookmarks", label: "Obeleženo", icon: Bookmark }],
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

      <div className="mt-auto border-t border-[#f0f0f0] px-2 py-3">
        <Select value={group} onValueChange={handleGroupChange}>
          <SelectTrigger className="flex w-full items-center gap-2 rounded-md bg-[#f5f5f4] px-3 py-2 text-xs shadow-none hover:bg-[#eee]">
            <User className="size-4 text-[#888]" />
            <div className="flex flex-1 flex-col items-start text-left">
              <span className="text-[11px] text-[#888]">Trenutna grupa</span>
              <SelectValue
                placeholder="Nije odabrano"
                className="text-[13px] font-medium text-[#333]"
              />
            </div>
          </SelectTrigger>
          <SelectContent>
            {groups.map((g) => (
              <SelectItem key={g} value={String(g)}>
                Grupa {g}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {!user && isGuest && (
          <button
            onClick={() => setAuthOpen(true)}
            className="mt-2 flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-[13px] text-[#555] transition-colors hover:bg-[#f5f5f4]"
          >
            <LogIn className="size-4" />
            Prijavi se / Registruj se
          </button>
        )}

        {user && (
          <div className="mt-2 flex items-center justify-between rounded-md bg-[#f5f5f4] px-3 py-2">
            <span className="text-[13px] font-medium text-[#333]">{user.name}</span>
            <button
              onClick={logout}
              className="cursor-pointer text-[#888] hover:text-[#111]"
              title="Odjavi se"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        )}
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </aside>
  )
}

function TopBar() {
  const group = getGroup()
  const { user, isGuest, logout } = useAuth()
  const [authOpen, setAuthOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex h-12 items-center justify-between border-b bg-white px-6">
      <span className="text-base font-bold tracking-tight">Indeks</span>
      <div className="flex items-center gap-4 text-[13px] text-[#555]">
        <Link to="/subjects" className="hover:text-[#111]">
          Predmeti
        </Link>
        {group && (
          <span className="rounded bg-[#f0f0f0] px-2 py-0.5 text-xs font-medium">
            Grupa {group}
          </span>
        )}
        {user ? (
          <span className="flex items-center gap-2">
            <span className="text-xs text-[#888]">{user.name}</span>
            <button onClick={logout} className="cursor-pointer hover:text-[#111]" title="Odjavi se">
              <LogOut className="size-4" />
            </button>
          </span>
        ) : isGuest ? (
          <button
            onClick={() => setAuthOpen(true)}
            className="flex cursor-pointer items-center gap-1 hover:text-[#111]"
          >
            <LogIn className="size-4" />
            Prijavi se
          </button>
        ) : null}
        <Link to="/bookmarks" className="hover:text-[#111]">
          <Bookmark className="size-4" />
        </Link>
      </div>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </header>
  )
}

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  return (
    <AuthProvider>
      <RootContent />
    </AuthProvider>
  )
}

function RootContent() {
  const { user, isGuest, loading } = useAuth()
  const location = useLocation()

  if (loading) return null

  if (!user && !isGuest) {
    return <WelcomeScreen />
  }

  const isViewer = location.pathname.includes("/materials/")
  const isHome = location.pathname === "/"

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
}
