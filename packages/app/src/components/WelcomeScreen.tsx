import { useState } from "react"
import { useAuth } from "@/hooks/useAuth"
import { AuthModal } from "@/components/AuthModal"
import { GraduationCap, LogIn, UserPlus, Eye, Languages, Moon, Sun } from "lucide-react"
import { useI18n } from "@/hooks/useI18n"
import { toggleTheme, getInitialTheme } from "@/lib/theme"

export function WelcomeScreen() {
  const { continueAsGuest } = useAuth()
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<"login" | "register">("login")
  const { t, toggleLocale, locale } = useI18n()
  const [theme, setTheme] = useState<"light" | "dark">(getInitialTheme)

  const toggleThemeHandler = () => {
    setTheme((prev) => toggleTheme(prev))
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center px-6"
      style={{ background: "var(--bg-page)" }}
    >
      <div className="flex max-w-sm flex-col items-center text-center">
        <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-[var(--text-primary)]">
          <GraduationCap className="size-7" style={{ color: "var(--bg-surface)" }} />
        </div>

        <h1 className="text-[1.75rem] font-bold tracking-tight text-[var(--text-primary)]">
          Indeks
        </h1>
        <p className="mt-1.5 text-[0.875rem] leading-relaxed text-[var(--text-secondary)]">
          {t("welcome.description")}
        </p>

        <div className="mt-9 flex w-full flex-col gap-2.5">
          <button
            onClick={() => {
              setAuthMode("login")
              setAuthOpen(true)
            }}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent)] text-sm font-medium text-white transition-all duration-100 hover:opacity-85 active:scale-[0.98]"
          >
            <LogIn className="size-4" />
            {t("welcome.login")}
          </button>

          <button
            onClick={() => {
              setAuthMode("register")
              setAuthOpen(true)
            }}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-[var(--border-default)] text-sm font-medium text-[var(--text-secondary)] transition-all duration-100 hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] active:scale-[0.98]"
            style={{ background: "var(--bg-surface)" }}
          >
            <UserPlus className="size-4" />
            {t("welcome.register")}
          </button>

          <div className="relative my-1">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-[var(--border-faint)]" />
            </div>
            <div className="relative flex justify-center">
              <span
                className="px-3 text-[0.688rem] uppercase tracking-[0.031rem] text-[var(--text-hint)]"
                style={{ background: "var(--bg-page)" }}
              >
                {t("welcome.or")}
              </span>
            </div>
          </div>

          <button
            onClick={continueAsGuest}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-[var(--border-default)] text-sm text-[var(--text-secondary)] transition-all duration-100 hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] active:scale-[0.98]"
            style={{ background: "var(--bg-surface)" }}
          >
            <Eye className="size-4" />
            {t("welcome.continue_as_guest")}
          </button>
        </div>

        <p className="mt-6 text-[0.75rem] text-[var(--text-hint)]">{t("welcome.guest_note")}</p>

        <div className="mt-6 flex items-center gap-2">
          <button
            onClick={toggleLocale}
            className="flex cursor-pointer items-center gap-1.5 rounded-md border border-[var(--border-default)] px-3 py-1.5 text-xs text-[var(--text-secondary)] transition-all duration-100 hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
            style={{ background: "var(--bg-surface)" }}
          >
            <Languages className="size-3.5" />
            <span className="min-w-[3.5rem] text-center">
              {locale === "sr" ? "English" : "Srpski"}
            </span>
          </button>
          <button
            onClick={toggleThemeHandler}
            className="flex cursor-pointer items-center justify-center rounded-md border border-[var(--border-default)] px-3 py-1.5 text-xs text-[var(--text-secondary)] transition-all duration-100 hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
            style={{ background: "var(--bg-surface)" }}
          >
            {theme === "dark" ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
          </button>
        </div>
      </div>

      <AuthModal
        key={authMode}
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        initialMode={authMode}
      />
    </div>
  )
}
