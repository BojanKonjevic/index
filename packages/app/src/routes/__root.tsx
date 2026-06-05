import { createRootRoute, Outlet, Link, useLocation } from "@tanstack/react-router"
import {
  Home,
  BookOpen,
  Bookmark,
  User,
  GraduationCap,
  LogIn,
  LogOut,
  Languages,
  Moon,
  Sun,
  ChevronDown,
} from "lucide-react"
import { cn } from "@/lib/utils"

import { useState, useEffect } from "react"
import { AuthProvider, useAuth } from "@/hooks/useAuth"
import { BookmarkProvider } from "@/hooks/useBookmarks"
import { AuthModal } from "@/components/AuthModal"
import { WelcomeScreen } from "@/components/WelcomeScreen"
import { useI18n } from "@/hooks/useI18n"

const groups = Array.from({ length: 14 }, (_, i) => i + 1)

let cachedGroup: string | null = null

function getGroup(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("group")
}

function NavItem({ to, icon: Icon, label }: { to: string; icon: typeof Home; label: string }) {
  const location = useLocation()
  const isActive = to === "/" ? location.pathname === "/" : location.pathname.startsWith(to)

  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-[0.563rem] rounded-[0.438rem] px-[0.563rem] py-[0.438rem] text-[0.813rem] transition-colors duration-100 mb-[0.063rem]",
        isActive
          ? "bg-[var(--nav-active-bg)] text-[var(--nav-active-text)] font-medium"
          : "text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]",
      )}
    >
      <Icon
        className={cn("size-[0.938rem]", isActive ? "opacity-90" : "text-[var(--text-hint)]")}
      />
      {label}
    </Link>
  )
}

function Sidebar() {
  const [group, setGroup] = useState<string | null>(cachedGroup ?? getGroup())
  const { user, isGuest, logout } = useAuth()
  const [authOpen, setAuthOpen] = useState(false)
  const [groupOpen, setGroupOpen] = useState(false)
  const { t, toggleLocale, locale } = useI18n()
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof document === "undefined") return "light"
    return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light"
  })

  useEffect(() => {
    if (!user) return
    if (cachedGroup) return
    fetch("/api/preferences")
      .then((r) => r.json())
      .then((data) => {
        if (data.group) {
          cachedGroup = data.group
          setGroup(data.group)
          localStorage.setItem("group", data.group)
        }
      })
      .catch(() => {})
  }, [user])

  const handleGroupChange = (v: string | null) => {
    if (!v) return
    cachedGroup = v
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

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark"
    setTheme(next)
    document.documentElement.setAttribute("data-theme", next)
    localStorage.setItem("theme", next)
  }

  const navItems = [
    {
      section: t("nav.navigation"),
      items: [
        { to: "/", label: t("nav.home"), icon: Home },
        { to: "/subjects", label: t("nav.subjects"), icon: BookOpen },
      ],
    },
    {
      section: t("nav.personal"),
      items: [{ to: "/bookmarks", label: t("nav.bookmarks"), icon: Bookmark }],
    },
  ]

  return (
    <aside className="fixed left-0 top-0 h-screen w-[13rem] flex flex-col border-r bg-[var(--bg-surface)] border-[var(--border-default)] z-40">
      <div className="flex items-center gap-2.5 px-4 py-[1.125rem] pb-3.5 border-b border-[var(--border-faint)]">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-[1.875rem] h-[1.875rem] rounded-[0.5rem] bg-[var(--text-primary)] flex items-center justify-center">
            <GraduationCap className="size-[0.938rem] text-[var(--bg-surface)]" />
          </div>
          <span className="text-[1.063rem] font-semibold tracking-[-0.3px] text-[var(--text-primary)]">
            Indeks
          </span>
        </Link>
      </div>

      <nav className="flex-1 flex flex-col gap-0 px-2 py-3">
        {navItems.map((section) => (
          <div key={section.section}>
            <div className="px-2 pb-1 pt-2 text-[0.625rem] font-semibold uppercase tracking-[0.05rem] text-[var(--text-hint)]">
              {section.section}
            </div>
            {section.items.map((item) => (
              <NavItem key={item.to} to={item.to} icon={item.icon} label={item.label} />
            ))}
          </div>
        ))}
      </nav>

      <div className="mt-auto border-t border-[var(--border-faint)] px-2 py-3 flex flex-col gap-1">
        <div className="relative">
          <button
            onClick={() => setGroupOpen(!groupOpen)}
            className="flex w-full items-center gap-2 rounded-[0.438rem] bg-[var(--bg-subtle)] px-[0.563rem] py-[0.438rem] text-xs transition-colors hover:bg-[var(--bg-inset)] cursor-pointer"
          >
            <User className="size-[0.875rem] text-[var(--text-hint)] shrink-0" />
            <div className="flex flex-col flex-1 min-w-0 text-left">
              <span className="text-[0.625rem] text-[var(--text-hint)]">
                {t("sidebar.group_label")}
              </span>
              <span className="text-[0.781rem] font-medium text-[var(--text-primary)] truncate">
                {group ? t("sidebar.group_fmt", { g: group }) : t("sidebar.group_placeholder")}
              </span>
            </div>
            <ChevronDown className="size-[0.813rem] text-[var(--text-hint)] shrink-0" />
          </button>
          {groupOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setGroupOpen(false)} />
              <div className="absolute bottom-full left-0 right-0 z-50 mb-1 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-md overflow-y-auto max-h-[18.75rem] dropdown-enter">
                {groups.map((g) => (
                  <button
                    key={g}
                    onClick={() => {
                      handleGroupChange(String(g))
                      setGroupOpen(false)
                    }}
                    className={`w-full cursor-pointer px-3 py-2 text-left text-[0.813rem] transition-colors duration-100 hover:bg-[var(--bg-subtle)] ${
                      group === String(g)
                        ? "bg-[var(--nav-active-bg)] text-[var(--nav-active-text)]"
                        : "text-[var(--text-primary)]"
                    }`}
                  >
                    {t("sidebar.group_fmt", { g })}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {user && (
          <div className="flex items-center justify-between rounded-[0.438rem] bg-[var(--bg-subtle)] px-[0.563rem] py-[0.438rem]">
            <span className="text-[0.813rem] font-medium text-[var(--text-primary)] truncate">
              {user.name}
            </span>
            <button
              onClick={logout}
              className="shrink-0 cursor-pointer text-[var(--text-hint)] hover:text-[var(--text-primary)] transition-colors"
              title={t("nav.logout")}
            >
              <LogOut className="size-[0.875rem]" />
            </button>
          </div>
        )}

        {!user && isGuest && (
          <button
            onClick={() => setAuthOpen(true)}
            className="flex w-full cursor-pointer items-center gap-2 rounded-[0.438rem] px-[0.563rem] py-[0.438rem] text-[0.813rem] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-subtle)]"
          >
            <LogIn className="size-[0.875rem]" />
            {t("nav.login_register")}
          </button>
        )}

        <div className="flex items-center gap-1 mt-1">
          <button
            onClick={toggleLocale}
            className="flex items-center justify-center w-8 h-8 rounded-[0.438rem] text-[var(--text-hint)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition-colors"
            title={locale === "sr" ? "Switch to English" : "Prebaci na srpski"}
          >
            <Languages className="size-[0.938rem]" />
          </button>
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center w-8 h-8 rounded-[0.438rem] text-[var(--text-hint)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition-colors"
          >
            {theme === "dark" ? (
              <Sun className="size-[0.938rem]" />
            ) : (
              <Moon className="size-[0.938rem]" />
            )}
          </button>
        </div>
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </aside>
  )
}

function AnimatedOutlet() {
  const location = useLocation()
  return (
    <div key={location.pathname} className="page-enter">
      <Outlet />
    </div>
  )
}

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  return (
    <AuthProvider>
      <BookmarkProvider>
        <RootContent />
      </BookmarkProvider>
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

  if (isViewer) {
    return (
      <div className="min-h-screen" style={{ background: "var(--bg-page)" }}>
        <Outlet />
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-page)" }}>
      <Sidebar />
      <main className="ml-[13rem] min-h-screen">
        <AnimatedOutlet />
      </main>
    </div>
  )
}
