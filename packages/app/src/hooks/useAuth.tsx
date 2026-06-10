import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { fetchApi } from "@/lib/api"

interface User {
  id: string
  name: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  isGuest: boolean
  login: (name: string, password: string) => Promise<void>
  register: (name: string, password: string) => Promise<void>
  logout: () => Promise<void>
  continueAsGuest: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuthLogic()
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}

function useAuthLogic(): AuthContextType {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isGuest, setIsGuest] = useState(() => localStorage.getItem("guest") === "true")

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) setUser(data.user)
        setLoading(false)
      })
      .catch((e) => {
        console.error("Failed to fetch current user:", e)
        setLoading(false)
      })
  }, [])

  const register = async (name: string, password: string) => {
    const localBookmarks = localStorage.getItem("bookmarks")
    const localGroup = localStorage.getItem("group")
    const localHistory = localStorage.getItem("recentlyOpened")
    const body: Record<string, unknown> = { name, password }
    if (localBookmarks) body.bookmarks = JSON.parse(localBookmarks)
    if (localGroup) body.group = localGroup
    if (localHistory) {
      const items: { materialId: string }[] = JSON.parse(localHistory)
      body.history = items.map((i) => i.materialId)
    }

    const data = await fetchApi<{ user: User }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    })
    setUser(data.user)
    localStorage.removeItem("guest")
    setIsGuest(false)
  }

  const login = async (name: string, password: string) => {
    const data = await fetchApi<{ user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ name, password }),
    })
    setUser(data.user)
    localStorage.removeItem("guest")
    setIsGuest(false)
  }

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    setUser(null)
    localStorage.setItem("guest", "true")
    setIsGuest(true)
  }

  const continueAsGuest = () => {
    localStorage.setItem("guest", "true")
    setIsGuest(true)
  }

  return { user, loading, isGuest, login, register, logout, continueAsGuest }
}
