import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from "react"
import { useAuth } from "@/hooks/useAuth"
import { localeHeaders } from "@/lib/api"

interface PreferencesContextValue {
  group: string | null
  setGroup: (group: string) => Promise<void>
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null)

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [group, setGroupState] = useState<string | null>(() => localStorage.getItem("group"))
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
