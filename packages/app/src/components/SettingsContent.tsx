import { LogIn, LogOut, Sun, Moon, Languages } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { usePreferences } from "@/hooks/usePreferences"
import { useI18n } from "@/hooks/useI18n"
import { cn } from "@/lib/utils"

const GROUP_NUMBERS = Array.from({ length: 14 }, (_, i) => i + 1)

interface Props {
  theme: "light" | "dark"
  onToggleTheme: () => void
  onAuthClick?: () => void
}

export function SettingsContent({ theme, onToggleTheme, onAuthClick }: Props) {
  const { group, setGroup: setGroupPreference } = usePreferences()
  const { user, isGuest, logout } = useAuth()
  const { t, toggleLocale, locale } = useI18n()

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <span className="text-[0.625rem] font-semibold uppercase tracking-[0.05rem] text-[var(--text-hint)]">
          {t("sidebar.group_label")}
        </span>
        <div className="grid grid-cols-4 gap-1.5">
          {GROUP_NUMBERS.map((g) => (
            <button
              key={g}
              onClick={() => setGroupPreference(String(g))}
              className={cn(
                "cursor-pointer rounded-md border px-1 py-1.5 text-[0.75rem] transition-colors duration-100",
                group === String(g)
                  ? "border-[var(--accent)] bg-[var(--accent-bg)] font-medium text-[var(--accent-strong)]"
                  : "border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]",
              )}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <div className="h-px bg-[var(--border-faint)]" />

      {user ? (
        <div className="flex items-center justify-between rounded-[0.438rem] bg-[var(--bg-subtle)] px-2.5 py-2">
          <span className="truncate text-[0.813rem] font-medium text-[var(--text-primary)]">
            {user.name}
          </span>
          <button
            onClick={logout}
            aria-label={t("nav.logout")}
            className="flex shrink-0 cursor-pointer items-center gap-1.5 text-[var(--text-hint)] transition-colors hover:text-[var(--text-primary)]"
          >
            <LogOut className="size-4" />
            <span className="text-xs">{t("nav.logout")}</span>
          </button>
        </div>
      ) : (
        isGuest && (
          <button
            onClick={onAuthClick}
            className="flex w-full cursor-pointer items-center gap-2 rounded-[0.438rem] px-2.5 py-2 text-[0.813rem] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-subtle)]"
          >
            <LogIn className="size-4" />
            {t("nav.login_register")}
          </button>
        )
      )}

      <div className="h-px bg-[var(--border-faint)]" />

      <div className="flex items-center gap-1.5">
        <button
          onClick={toggleLocale}
          className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[0.438rem] border border-[var(--border-default)] px-2 py-1.5 text-[0.688rem] text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
        >
          <Languages className="size-3.5" />
          <span>{locale === "sr" ? "EN" : "SR"}</span>
        </button>
        <button
          onClick={onToggleTheme}
          aria-label={theme === "dark" ? "Light" : "Dark"}
          className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[0.438rem] border border-[var(--border-default)] px-2 py-1.5 text-[0.688rem] text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
        >
          {theme === "dark" ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
          <span>{theme === "dark" ? "Light" : "Dark"}</span>
        </button>
      </div>
    </div>
  )
}
