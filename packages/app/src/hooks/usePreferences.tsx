import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from "react"
import { useAuth } from "@/hooks/useAuth"
import { localeHeaders } from "@/lib/api"

interface PreferencesContextValue {
  group: string | null
  setGroup: (group: string) => Promise<void>
  viewMode: "grid" | "list"
  setViewMode: (mode: "grid" | "list") => void
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null)

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [group, setGroupState] = useState<string | null>(() => localStorage.getItem("group"))
  const [viewMode, setViewModeState] = useState<"grid" | "list">(
    () => (localStorage.getItem("viewMode") as "grid" | "list") || "grid",
  )
  const fetchRef = useRef(0)

  useEffect(() => {
    if (!user?.id) return
    const thisFetch = ++fetchRef.current
    fetch("/api/preferences", { headers: localeHeaders() })
      .then((r) => r.json())
      .then((data) => {
        if (thisFetch !== fetchRef.current) return
        if (data.group) {
          setGroupState(data.group)
          localStorage.setItem("group", data.group)
        }
      })
      .catch(() => {})
  }, [user?.id])

  const setGroup = async (value: string) => {
    const prevValue = group
    setGroupState(value)
    localStorage.setItem("group", value)
    if (user) {
      try {
        const res = await fetch("/api/preferences", {
          method: "PUT",
          headers: localeHeaders(),
          body: JSON.stringify({ group: value }),
        })
        if (!res.ok) throw new Error("Failed to save preference")
      } catch (e) {
        setGroupState(prevValue)
        if (prevValue) {
          localStorage.setItem("group", prevValue)
        } else {
          localStorage.removeItem("group")
        }
        console.error("Failed to save preference:", e)
      }
    }
  }

  const setViewMode = (mode: "grid" | "list") => {
    setViewModeState(mode)
    localStorage.setItem("viewMode", mode)
  }

  return (
    <PreferencesContext.Provider value={{ group, setGroup, viewMode, setViewMode }}>
      {children}
    </PreferencesContext.Provider>
  )
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext)
  if (!ctx) throw new Error("usePreferences must be used within PreferencesProvider")
  return ctx
}
