import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { useAuth } from "@/hooks/useAuth"

interface PreferencesContextValue {
  group: string | null
  setGroup: (group: string) => Promise<void>
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null)

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [group, setGroupState] = useState<string | null>(() => localStorage.getItem("group"))

  useEffect(() => {
    if (!user) return
    fetch("/api/preferences")
      .then((r) => r.json())
      .then((data) => {
        if (data.group) {
          setGroupState(data.group)
          localStorage.setItem("group", data.group)
        }
      })
      .catch(() => {})
  }, [user?.id])

  const setGroup = useCallback(
    async (value: string) => {
      setGroupState(value)
      localStorage.setItem("group", value)
      if (user) {
        await fetch("/api/preferences", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ group: value }),
        }).catch(() => {})
      }
    },
    [user],
  )

  return (
    <PreferencesContext.Provider value={{ group, setGroup }}>
      {children}
    </PreferencesContext.Provider>
  )
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext)
  if (!ctx) throw new Error("usePreferences must be used within PreferencesProvider")
  return ctx
}
