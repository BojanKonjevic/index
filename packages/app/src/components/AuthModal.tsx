import { useState } from "react"
import { useAuth } from "@/hooks/useAuth"
import { X } from "lucide-react"
import { useI18n } from "@/hooks/useI18n"

interface AuthModalProps {
  open: boolean
  onClose: () => void
}

type Mode = "login" | "register"

export function AuthModal({ open, onClose }: AuthModalProps) {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<Mode>("login")
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const { t } = useI18n()

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!name.trim() || !password) {
      setError(t("auth.fill_fields"))
      return
    }
    setSubmitting(true)
    try {
      if (mode === "login") {
        await login(name.trim(), password)
      } else {
        await register(name.trim(), password)
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.error"))
    } finally {
      setSubmitting(false)
    }
  }

  const switchMode = () => {
    setMode(mode === "login" ? "register" : "login")
    setError("")
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/40">
      <div
        className="w-full max-w-sm rounded-xl border border-[var(--border-default)] p-6 shadow-lg max-h-[90vh] overflow-y-auto"
        style={{ background: "var(--bg-surface)" }}
      >
        <div className="mb-5 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => {
                setMode("login")
                setError("")
              }}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-100 ${
                mode === "login"
                  ? "bg-[var(--nav-active-bg)] text-[var(--nav-active-text)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
              }`}
            >
              {t("auth.login_tab")}
            </button>
            <button
              onClick={() => {
                setMode("register")
                setError("")
              }}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-100 ${
                mode === "register"
                  ? "bg-[var(--nav-active-bg)] text-[var(--nav-active-text)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
              }`}
            >
              {t("auth.register_tab")}
            </button>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-md p-1 hover:bg-[var(--bg-subtle)] transition-colors duration-100"
          >
            <X className="size-5 text-[var(--text-secondary)]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-[0.813rem] font-medium text-[var(--text-secondary)]">
              {t("auth.username")}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 w-full rounded-md border border-[var(--border-default)] px-3 text-[0.813rem] text-[var(--text-primary)] outline-none transition-colors duration-100 focus:border-[var(--accent)]"
              style={{ background: "var(--bg-surface)" }}
              autoFocus
            />
          </div>

          <div>
            <label className="mb-1 block text-[0.813rem] font-medium text-[var(--text-secondary)]">
              {t("auth.password")}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-9 w-full rounded-md border border-[var(--border-default)] px-3 text-[0.813rem] text-[var(--text-primary)] outline-none transition-colors duration-100 focus:border-[var(--accent)]"
              style={{ background: "var(--bg-surface)" }}
            />
          </div>

          {error && <p className="text-[0.813rem] text-[var(--status-soon-text)]">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="h-9 w-full rounded-md bg-[var(--accent)] text-sm font-medium text-white transition-all duration-100 hover:opacity-85 active:scale-[0.98] disabled:opacity-50"
          >
            {submitting
              ? "..."
              : mode === "login"
                ? t("auth.submit_login")
                : t("auth.submit_register")}
          </button>

          <p className="text-center text-[0.75rem] text-[var(--text-hint)]">
            {mode === "login" ? (
              <>
                {t("auth.no_account")}{" "}
                <button
                  type="button"
                  onClick={switchMode}
                  className="cursor-pointer underline text-[var(--accent)]"
                >
                  {t("auth.register_link")}
                </button>
              </>
            ) : (
              <>
                {t("auth.has_account")}{" "}
                <button
                  type="button"
                  onClick={switchMode}
                  className="cursor-pointer underline text-[var(--accent)]"
                >
                  {t("auth.login_link")}
                </button>
              </>
            )}
          </p>
        </form>
      </div>
    </div>
  )
}
