import { createRootRoute, Outlet, Link, useLocation } from "@tanstack/react-router"
import {
  Home,
  BookOpen,
  Bookmark,
  LogOut,
  Sun,
  Moon,
  Languages,
  GraduationCap,
  User,
  LogIn,
  ChevronDown,
  SlidersHorizontal,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toggleTheme } from "@/lib/theme"

import { useState } from "react"
import { AuthProvider, useAuth } from "@/hooks/useAuth"
import { BookmarkProvider } from "@/hooks/useBookmarks"
import { ErrorFallback } from "@/components/ErrorFallback"
import { PreferencesProvider, usePreferences } from "@/hooks/usePreferences"
import { AuthModal } from "@/components/AuthModal"
import { WelcomeScreen } from "@/components/WelcomeScreen"
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useI18n } from "@/hooks/useI18n"
import { Skeleton } from "@/components/Skeleton"

const groups = Array.from({ length: 14 }, (_, i) => i + 1)

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

function BottomTabBar() {
  const location = useLocation()
  const { t, toggleLocale, locale } = useI18n()
  const { user, isGuest, logout } = useAuth()
  const { group, setGroup: setGroupPreference } = usePreferences()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof document === "undefined") return "light"
    return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light"
  })

  const toggleThemeHandler = () => {
    setTheme((prev) => toggleTheme(prev))
  }

  const tabs = [
    { to: "/", label: t("nav.home"), icon: Home },
    { to: "/subjects", label: t("nav.subjects"), icon: BookOpen },
    { to: "/bookmarks", label: t("nav.bookmarks"), icon: Bookmark },
    { to: "#settings", label: t("sidebar.settings"), icon: SlidersHorizontal, isSettings: true },
  ]

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-14 items-center border-t bg-[var(--bg-surface)] border-[var(--border-default)] pb-safe md:hidden">
        {tabs.map((tab) => {
          if (tab.isSettings) {
            return (
              <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
                <SheetTrigger className="flex flex-1 flex-col items-center justify-center h-full gap-0.5 text-[var(--text-hint)] hover:text-[var(--text-primary)] transition-colors duration-100">
                  <SlidersHorizontal className="size-[1.125rem]" />
                </SheetTrigger>
                <SheetContent side="bottom" className="max-h-[85vh] flex flex-col">
                  <div className="mx-auto mt-2 mb-3 h-1 w-10 shrink-0 rounded-full bg-[var(--border-strong)]" />
                  <SheetHeader>
                    <SheetTitle className="text-left">{t("sidebar.settings")}</SheetTitle>
                  </SheetHeader>
                  <div className="flex-1 overflow-y-auto px-4 pb-6">
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-[0.625rem] font-semibold uppercase tracking-[0.05rem] text-[var(--text-hint)]">
                          {t("sidebar.group_label")}
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {groups.map((g) => (
                            <button
                              key={g}
                              onClick={() => setGroupPreference(String(g))}
                              className={`rounded-full border px-3 py-1.5 text-[0.75rem] transition-all duration-100 ${
                                group === String(g)
                                  ? "border-[var(--accent)] bg-[var(--accent-bg)] text-[var(--accent-strong)] font-medium"
                                  : "border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
                              }`}
                            >
                              {t("sidebar.group_fmt", { g })}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="h-px bg-[var(--border-faint)]" />

                      {user && (
                        <div className="flex items-center justify-between rounded-[0.438rem] bg-[var(--bg-subtle)] px-3 py-2.5">
                          <span className="text-[0.813rem] font-medium text-[var(--text-primary)] truncate">
                            {user.name}
                          </span>
                          <button
                            onClick={logout}
                            className="shrink-0 cursor-pointer text-[var(--text-hint)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1.5"
                          >
                            <LogOut className="size-4" />
                            <span className="text-xs">{t("nav.logout")}</span>
                          </button>
                        </div>
                      )}

                      {!user && isGuest && (
                        <button
                          onClick={() => {
                            setSettingsOpen(false)
                            setTimeout(() => setAuthOpen(true), 200)
                          }}
                          className="flex w-full cursor-pointer items-center gap-2 rounded-[0.438rem] px-3 py-2.5 text-[0.813rem] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-subtle)]"
                        >
                          <LogIn className="size-4" />
                          {t("nav.login_register")}
                        </button>
                      )}

                      <div className="h-px bg-[var(--border-faint)]" />

                      <div className="flex items-center gap-2">
                        <button
                          onClick={toggleLocale}
                          className="flex items-center gap-1.5 rounded-[0.438rem] border border-[var(--border-default)] px-3 py-2 text-xs text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
                        >
                          <Languages className="size-4" />
                          <span>{locale === "sr" ? "English" : "Srpski"}</span>
                        </button>
                        <button
                          onClick={toggleThemeHandler}
                          className="flex items-center justify-center rounded-[0.438rem] border border-[var(--border-default)] px-3 py-2 text-xs text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
                        >
                          {theme === "dark" ? (
                            <Sun className="size-4" />
                          ) : (
                            <Moon className="size-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            )
          }
          const isActive =
            tab.to === "/" ? location.pathname === "/" : location.pathname.startsWith(tab.to)
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={`flex flex-1 flex-col items-center justify-center h-full gap-0.5 transition-colors duration-100 ${
                isActive
                  ? "text-[var(--accent)]"
                  : "text-[var(--text-hint)] hover:text-[var(--text-primary)]"
              }`}
            >
              <tab.icon className="size-[1.125rem]" />
              <span className="text-[0.625rem] font-medium">{tab.label}</span>
            </Link>
          )
        })}
      </nav>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  )
}

function Sidebar() {
  const { group, setGroup: setGroupPreference } = usePreferences()
  const { user, isGuest, logout } = useAuth()
  const [authOpen, setAuthOpen] = useState(false)
  const [groupOpen, setGroupOpen] = useState(false)
  const { t, toggleLocale, locale } = useI18n()
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof document === "undefined") return "light"
    return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light"
  })

  const toggleThemeHandler = () => {
    setTheme((prev) => toggleTheme(prev))
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
    <aside className="fixed left-0 top-0 h-screen w-[14rem] flex-col border-r bg-[var(--bg-surface)] border-[var(--border-default)] z-40 hidden md:flex md:flex-col">
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

      <nav className="flex-1 flex flex-col gap-0.5 px-2 pt-[0.875rem] pb-3">
        {navItems.map((section) => (
          <div key={section.section}>
            <div className="px-2 pb-[0.375rem] pt-0.5 text-[0.625rem] font-semibold uppercase tracking-[0.05rem] text-[var(--text-hint)]">
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
              <span className="text-[0.75rem] font-medium text-[var(--text-primary)] truncate">
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
                      setGroupPreference(String(g))
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

        <div className="h-px bg-[var(--border-faint)] my-1.5" />
        <div className="flex items-center gap-2">
          <button
            onClick={toggleLocale}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-[0.438rem] border border-[var(--border-default)] px-2 py-1.5 text-[0.688rem] text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
            title={locale === "sr" ? "Switch to English" : "Prebaci na srpski"}
          >
            <Languages className="size-[0.875rem]" />
            <span>{locale === "sr" ? "EN" : "SR"}</span>
          </button>
          <button
            onClick={toggleThemeHandler}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-[0.438rem] border border-[var(--border-default)] px-2 py-1.5 text-[0.688rem] text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
          >
            {theme === "dark" ? (
              <Sun className="size-[0.875rem]" />
            ) : (
              <Moon className="size-[0.875rem]" />
            )}
            <span>{theme === "dark" ? "Light" : "Dark"}</span>
          </button>
        </div>
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </aside>
  )
}

function AnimatedOutlet() {
  return (
    <div className="page-enter">
      <Outlet />
    </div>
  )
}

export const Route = createRootRoute({
  component: RootLayout,
  errorComponent: ErrorFallback,
})

function RootLayout() {
  return (
    <AuthProvider>
      <BookmarkProvider>
        <PreferencesProvider>
          <RootContent />
        </PreferencesProvider>
      </BookmarkProvider>
    </AuthProvider>
  )
}

function RootContent() {
  const { user, isGuest, loading } = useAuth()

  if (loading) return <Skeleton />

  if (!user && !isGuest) {
    return <WelcomeScreen />
  }

  return (
    <div className="min-h-screen bg-bg-page">
      <Sidebar />
      <BottomTabBar />
      <main className="ml-0 md:ml-[14rem] min-h-screen pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0">
        <AnimatedOutlet />
      </main>
    </div>
  )
}
