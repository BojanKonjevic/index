import { useEffect, useState } from "react"

/** Shared fetch shape for the file viewers: fresh url resets state during
 *  render, the body loads in the effect, abort-safe. */
export function useFetchBytes(url: string): { data: Uint8Array | null; error: boolean } {
  const [state, setState] = useState<{ url: string; data: Uint8Array | null; error: boolean }>({
    url,
    data: null,
    error: false,
  })
  if (state.url !== url) {
    setState({ url, data: null, error: false })
  }

  useEffect(() => {
    let active = true
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.arrayBuffer()
      })
      .then((buf) => {
        if (active) setState({ url, data: new Uint8Array(buf), error: false })
      })
      .catch(() => {
        if (active) setState({ url, data: null, error: true })
      })
    return () => {
      active = false
    }
  }, [url])

  return state
}
