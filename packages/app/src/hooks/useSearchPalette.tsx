/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { getSubjectBundles, type OfflineSubjectRecord } from "@/lib/offline/db"

interface SearchPaletteContextValue {
  open: boolean
  openPalette: () => void
  closePalette: () => void
  togglePalette: () => void
  /** Bundles of fully downloaded subjects, refreshed on palette open. */
  offlineBundles: OfflineSubjectRecord[]
  refreshOfflineBundles: () => void
}

const SearchPaletteContext = createContext<SearchPaletteContextValue | null>(null)

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.closest("input, textarea, select")) return true
  return target.isContentEditable
}

export function SearchPaletteProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [offlineBundles, setOfflineBundles] = useState<OfflineSubjectRecord[]>([])

  const refreshOfflineBundles = useCallback(() => {
    getSubjectBundles()
      .then((bundles) =>
        setOfflineBundles(bundles.filter((bundle) => bundle.status === "complete")),
      )
      .catch(() => setOfflineBundles([]))
  }, [])

  useEffect(() => {
    refreshOfflineBundles()
  }, [refreshOfflineBundles])

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

  const openPalette = useCallback(() => {
    refreshOfflineBundles()
    setOpen(true)
  }, [refreshOfflineBundles])

  const value = useMemo<SearchPaletteContextValue>(
    () => ({
      open,
      openPalette,
      closePalette: () => setOpen(false),
      togglePalette: () => setOpen((v) => !v),
      offlineBundles,
      refreshOfflineBundles,
    }),
    [open, openPalette, offlineBundles, refreshOfflineBundles],
  )

  return <SearchPaletteContext.Provider value={value}>{children}</SearchPaletteContext.Provider>
}

export function useSearchPalette(): SearchPaletteContextValue {
  const ctx = useContext(SearchPaletteContext)
  if (!ctx) throw new Error("useSearchPalette must be used within SearchPaletteProvider")
  return ctx
}
