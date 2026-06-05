import { useState } from "react"
import { useAuth } from "@/hooks/useAuth"
import { X } from "lucide-react"

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

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!name.trim() || !password) {
      setError("Popuni sva polja.")
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
      setError(err instanceof Error ? err.message : "Greška.")
    } finally {
      setSubmitting(false)
    }
  }

  const switchMode = () => {
    setMode(mode === "login" ? "register" : "login")
    setError("")
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-xl border border-[#e0e0e0] bg-white p-6 shadow-lg">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => {
                setMode("login")
                setError("")
              }}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                mode === "login" ? "bg-[#111] text-white" : "text-[#666] hover:bg-[#f5f5f5]"
              }`}
            >
              Prijavi se
            </button>
            <button
              onClick={() => {
                setMode("register")
                setError("")
              }}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                mode === "register" ? "bg-[#111] text-white" : "text-[#666] hover:bg-[#f5f5f5]"
              }`}
            >
              Registruj se
            </button>
          </div>
          <button onClick={onClose} className="cursor-pointer rounded-md p-1 hover:bg-[#f0f0f0]">
            <X className="size-5 text-[#888]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-[13px] font-medium text-[#555]">Korisničko ime</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 w-full rounded-md border border-[#e0e0e0] bg-white px-3 text-[13px] outline-none focus:border-[#999]"
              autoFocus
            />
          </div>

          <div>
            <label className="mb-1 block text-[13px] font-medium text-[#555]">Lozinka</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-9 w-full rounded-md border border-[#e0e0e0] bg-white px-3 text-[13px] outline-none focus:border-[#999]"
            />
          </div>

          {error && <p className="text-[13px] text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="h-9 w-full rounded-md bg-[#111] text-sm font-medium text-white transition-colors hover:bg-[#333] disabled:opacity-50"
          >
            {submitting ? "..." : mode === "login" ? "Prijavi se" : "Napravi nalog"}
          </button>

          <p className="text-center text-[12px] text-[#999]">
            {mode === "login" ? (
              <>
                Nemaš nalog?{" "}
                <button
                  type="button"
                  onClick={switchMode}
                  className="cursor-pointer text-[#111] underline"
                >
                  Registruj se
                </button>
              </>
            ) : (
              <>
                Već imaš nalog?{" "}
                <button
                  type="button"
                  onClick={switchMode}
                  className="cursor-pointer text-[#111] underline"
                >
                  Prijavi se
                </button>
              </>
            )}
          </p>
        </form>
      </div>
    </div>
  )
}
