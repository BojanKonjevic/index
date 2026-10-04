/* eslint-disable react-refresh/only-export-components */
import { createRootRoute, Outlet, Link, useLocation } from "@tanstack/react-router"
import { Home, Bookmark, GraduationCap, SlidersHorizontal } from "lucide-react"
import { Search } from "lucide-react"

import { useState, useMemo } from "react"
import { AuthProvider, useAuth } from "@/hooks/useAuth"
import { BookmarkProvider } from "@/hooks/useBookmarks"
import { ErrorFallback } from "@/components/ErrorFallback"
import { PreferencesProvider } from "@/hooks/usePreferences"
import { ThemeProvider, useTheme } from "@/hooks/useTheme"
import { AuthModal } from "@/components/AuthModal"
import { WelcomeScreen } from "@/components/WelcomeScreen"
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useI18n } from "@/hooks/useI18n"
import { Skeleton } from "@/components/Skeleton"
import { SearchPaletteProvider, useSearchPalette } from "@/hooks/useSearchPalette"
import { useOnlineStatus } from "@/hooks/useOnlineStatus"
import CommandPalette from "@/components/CommandPalette"
import { OfflineBanner } from "@/components/OfflineBanner"
import { SettingsContent } from "@/components/SettingsContent"
import { HeaderSettingsButton } from "@/components/HeaderSettingsButton"
import { HeaderSearchButton } from "@/components/HeaderSearchButton"

const SETTINGS_CLOSE_DELAY_MS = 200
const VIEWER_PATH_RE = /^\/subjects\/[^/]+\/materials\/[^/]+/
const isViewerPath = (pathname: string) => VIEWER_PATH_RE.test(pathname)

function HeaderBookmarksButton() {
  const location = useLocation()
  const { t } = useI18n()
  const isActive = location.pathname.startsWith("/bookmarks")

  return (
    <Link
      to="/bookmarks"
      aria-label={t("nav.bookmarks")}
      className="relative flex size-9 items-center justify-center rounded-[0.5rem] border border-[var(--border-default)] text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
    >
      <Bookmark
        className={`size-4 ${isActive ? "fill-[var(--bookmark)] text-[var(--bookmark)]" : ""}`}
      />
    </Link>
  )
}

function BottomTabBar({
  theme,
  onToggleTheme,
}: {
  theme: "light" | "dark"
  onToggleTheme: () => void
}) {
  const location = useLocation()
  const { t } = useI18n()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const { openPalette } = useSearchPalette()

  const tabs = useMemo(
    () => [
      { to: "/", label: t("nav.home"), icon: Home },
      { to: "/bookmarks", label: t("nav.bookmarks"), icon: Bookmark },
      {
        to: "#search",
        label: t("nav.search"),
        icon: Search,
        isSearch: true as const,
      },
      {
        to: "#settings",
        label: t("sidebar.settings"),
        icon: SlidersHorizontal,
        isSettings: true as const,
      },
    ],
    [t],
  )

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-14 items-center border-t bg-[var(--bg-surface)] border-[var(--border-default)] pb-safe md:hidden">
        {tabs.map((tab) => {
          if (tab.isSearch) {
            return (
              <button
                key="search"
                onClick={openPalette}
                aria-label={t("nav.search")}
                className="flex flex-1 flex-col items-center justify-center h-full gap-0.5 text-[var(--text-hint)] hover:text-[var(--text-primary)] transition-colors duration-100 cursor-pointer"
              >
                <Search className="size-[1.125rem]" />
                <span className="text-[0.625rem] font-medium">{tab.label}</span>
              </button>
            )
          }
          if (tab.isSettings) {
            return (
              <Sheet key="settings" open={settingsOpen} onOpenChange={setSettingsOpen}>
                <SheetTrigger
                  aria-label={t("sidebar.settings")}
                  className="flex flex-1 flex-col items-center justify-center h-full gap-0.5 text-[var(--text-hint)] hover:text-[var(--text-primary)] transition-colors duration-100"
                >
                  <SlidersHorizontal className="size-[1.125rem]" />
                </SheetTrigger>
                <SheetContent side="bottom" className="max-h-[85vh] flex flex-col">
                  <div className="mx-auto mt-2 mb-3 h-1 w-10 shrink-0 rounded-full bg-[var(--border-strong)]" />
                  <SheetHeader>
                    <SheetTitle className="text-left">{t("sidebar.settings")}</SheetTitle>
                  </SheetHeader>
                  <div className="flex-1 overflow-y-auto px-4 pb-6">
                    <SettingsContent
                      theme={theme}
                      onToggleTheme={onToggleTheme}
                      onAuthClick={() => {
                        setSettingsOpen(false)
                        setTimeout(() => setAuthOpen(true), SETTINGS_CLOSE_DELAY_MS)
                      }}
                    />
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

function TopHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-[var(--bg-surface)] border-[var(--border-default)]">
      <div className="mx-auto flex h-14 w-full max-w-[72rem] items-center gap-1.5 px-4 md:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <div className="flex h-[1.875rem] w-[1.875rem] items-center justify-center rounded-[0.5rem] bg-[var(--text-primary)]">
            <GraduationCap className="size-[0.938rem] text-[var(--bg-surface)]" />
          </div>
          <span className="font-serif text-[1.125rem] font-semibold tracking-[-0.3px] text-[var(--text-primary)]">
            Indeks
          </span>
        </Link>

        <HeaderSearchButton hideOnMobile className="mx-auto w-full max-w-[32rem] flex-1" />

        <HeaderBookmarksButton />

        <HeaderSettingsButton hideOnMobile />
      </div>
    </header>
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
          <SearchPaletteProvider>
            <ThemeProvider>
              <RootContent />
            </ThemeProvider>
          </SearchPaletteProvider>
        </PreferencesProvider>
      </BookmarkProvider>
    </AuthProvider>
  )
}

function RootContent() {
  const { user, isGuest, loading } = useAuth()
  const location = useLocation()
  const isViewer = isViewerPath(location.pathname)
  const online = useOnlineStatus()
  const { theme, toggleTheme } = useTheme()

  if (loading) return <Skeleton />

  if (!user && !isGuest) {
    return <WelcomeScreen />
  }

  return (
    <div className="min-h-screen bg-bg-page">
      {!isViewer && <div className="grain-overlay" aria-hidden />}
      {!online && !isViewer && <OfflineBanner />}
      {!isViewer && <TopHeader />}
      {!isViewer && <BottomTabBar theme={theme} onToggleTheme={toggleTheme} />}
      <main
        className={`min-h-screen ${
          isViewer ? "" : "pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0"
        }`}
      >
        <AnimatedOutlet />
      </main>
      <CommandPalette />
    </div>
  )
}
