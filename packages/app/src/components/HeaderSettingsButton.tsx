import { SlidersHorizontal } from "lucide-react"
import { useState } from "react"
import { useAuth } from "@/hooks/useAuth"
import { useTheme } from "@/hooks/useTheme"
import { useI18n } from "@/hooks/useI18n"
import { AuthModal } from "@/components/AuthModal"
import { SettingsContent } from "@/components/SettingsContent"

export function HeaderSettingsButton({ hideOnMobile = false }: { hideOnMobile?: boolean }) {
  const { theme, toggleTheme } = useTheme()
  const { user } = useAuth()
  const { t } = useI18n()
  const [menuOpen, setMenuOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)

  return (
    <div className={`relative shrink-0 ${hideOnMobile ? "max-md:hidden" : ""}`}>
      <button
        onClick={() => setMenuOpen((v) => !v)}
        aria-label={t("sidebar.settings")}
        className="flex size-9 cursor-pointer items-center justify-center rounded-[0.5rem] border border-[var(--border-default)] text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
      >
        {user ? (
          <span className="text-[0.813rem] font-semibold">{user.name.charAt(0).toUpperCase()}</span>
        ) : (
          <SlidersHorizontal className="size-4" />
        )}
      </button>
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          <div className="dropdown-enter absolute right-0 z-50 mt-2 w-[15rem] rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-3 shadow-lg">
            <SettingsContent
              theme={theme}
              onToggleTheme={toggleTheme}
              onAuthClick={() => {
                setMenuOpen(false)
                setAuthOpen(true)
              }}
            />
          </div>
        </>
      )}
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  )
}
