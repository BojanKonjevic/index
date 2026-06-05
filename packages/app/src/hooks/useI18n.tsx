import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react"
import type { Locale } from "@/lib/i18n"
import { t as translate } from "@/lib/i18n"

interface I18nContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  toggleLocale: () => void
  t: (key: string, params?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextType | null>(null)

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "sr"
  const stored = localStorage.getItem("locale") as Locale | null
  return stored === "sr" || stored === "en" ? stored : "sr"
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale)

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    localStorage.setItem("locale", newLocale)
  }, [])

  const toggleLocale = useCallback(() => {
    setLocale(locale === "sr" ? "en" : "sr")
  }, [locale, setLocale])

  const t = useMemo(
    () => (key: string, params?: Record<string, string | number>) => translate(locale, key, params),
    [locale],
  )

  return (
    <I18nContext.Provider value={{ locale, setLocale, toggleLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n(): I18nContextType {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error("useI18n must be used within I18nProvider")
  return ctx
}
