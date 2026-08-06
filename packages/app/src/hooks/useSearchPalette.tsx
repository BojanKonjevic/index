/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

interface SearchPaletteContextValue {
  open: boolean
  openPalette: () => void
  closePalette: () => void
  togglePalette: () => void
}

const SearchPaletteContext = createContext<SearchPaletteContextValue | null>(null)

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.closest("input, textarea, select")) return true
  return target.isContentEditable
}

export function SearchPaletteProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen((v) => !v)
        return
      }
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey && !isEditable(e.target)) {
        e.preventDefault()
        setOpen(true)
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [])

  const value: SearchPaletteContextValue = {
    open,
    openPalette: () => setOpen(true),
    closePalette: () => setOpen(false),
    togglePalette: () => setOpen((v) => !v),
  }

  return <SearchPaletteContext.Provider value={value}>{children}</SearchPaletteContext.Provider>
}

export function useSearchPalette(): SearchPaletteContextValue {
  const ctx = useContext(SearchPaletteContext)
  if (!ctx) throw new Error("useSearchPalette must be used within SearchPaletteProvider")
  return ctx
}
