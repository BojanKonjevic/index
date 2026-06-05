import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

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

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}

function useAuthLogic(): AuthContextType {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isGuest, setIsGuest] = useState(false)

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) setUser(data.user)
        setLoading(false)
      })
      .catch(() => setLoading(false))

    setIsGuest(localStorage.getItem("guest") === "true")
  }, [])

  const login = async (name: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Greška prilikom prijave.")
    setUser(data.user)
    localStorage.removeItem("guest")
    setIsGuest(false)
  }

  const register = async (name: string, password: string) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Greška prilikom registracije.")
    setUser(data.user)
    localStorage.removeItem("guest")
    setIsGuest(false)
  }

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    setUser(null)
    localStorage.removeItem("guest")
    setIsGuest(false)
  }

  const continueAsGuest = () => {
    localStorage.setItem("guest", "true")
    setIsGuest(true)
  }

  return { user, loading, isGuest, login, register, logout, continueAsGuest }
}
