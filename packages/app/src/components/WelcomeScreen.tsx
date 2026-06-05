import { useState } from "react"
import { useAuth } from "@/hooks/useAuth"
import { AuthModal } from "@/components/AuthModal"
import { GraduationCap, LogIn, UserPlus, Eye } from "lucide-react"

export function WelcomeScreen() {
  const { continueAsGuest } = useAuth()
  const [authOpen, setAuthOpen] = useState(false)

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6">
      <div className="flex max-w-sm flex-col items-center text-center">
        <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-[#111]">
          <GraduationCap className="size-7 text-white" />
        </div>

        <h1 className="text-[28px] font-bold tracking-tight">Indeks</h1>
        <p className="mt-1.5 text-[14px] leading-relaxed text-[#666]">
          Study material aggregator za 3. godinu primenjenog računarstva na FTN-u.
        </p>

        <div className="mt-9 flex w-full flex-col gap-2.5">
          <button
            onClick={() => setAuthOpen(true)}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#111] text-sm font-medium text-white transition-colors hover:bg-[#333]"
          >
            <LogIn className="size-4" />
            Prijavi se
          </button>

          <button
            onClick={() => setAuthOpen(true)}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#d4d4d4] text-sm font-medium text-[#333] transition-colors hover:bg-[#f5f5f5]"
          >
            <UserPlus className="size-4" />
            Registruj se
          </button>

          <div className="relative my-1">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-[#e8e8e8]" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-[11px] uppercase tracking-[0.5px] text-[#bbb]">
                ili
              </span>
            </div>
          </div>

          <button
            onClick={continueAsGuest}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#e0e0e0] text-sm text-[#888] transition-colors hover:bg-[#fafafa] hover:text-[#555]"
          >
            <Eye className="size-4" />
            Nastavi kao gost
          </button>
        </div>

        <p className="mt-6 text-[12px] text-[#bbb]">
          Gosti mogu da pregledaju materijale. Nalog omogućava sinhronizaciju obeleženih stavki.
        </p>
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  )
}
