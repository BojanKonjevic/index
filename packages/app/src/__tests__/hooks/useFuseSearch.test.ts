import { describe, it, expect } from "vitest"
import { renderHook } from "@testing-library/react"
import { useFuseSearch } from "@/hooks/useFuseSearch"

const items = [
  { id: "1", name: "Matematička analiza 2" },
  { id: "2", name: "Računarska inteligencija" },
  { id: "3", name: "Web tehnologije" },
]

const options = { keys: ["name"] }

describe("useFuseSearch", () => {
  it("returns all items for empty query", () => {
    const { result } = renderHook(() => useFuseSearch(items, options, ""))
    expect(result.current).toHaveLength(3)
  })

  it("finds items by exact match", () => {
    const { result } = renderHook(() => useFuseSearch(items, options, "Web tehnologije"))
    expect(result.current).toHaveLength(1)
    expect(result.current[0].id).toBe("3")
  })

  it("finds items case-insensitively", () => {
    const { result } = renderHook(() => useFuseSearch(items, options, "web TEHNOLOGIJE"))
    expect(result.current).toHaveLength(1)
    expect(result.current[0].id).toBe("3")
  })

  it("ignores diacritics", () => {
    const { result } = renderHook(() => useFuseSearch(items, options, "Matematicka"))
    expect(result.current).toHaveLength(1)
    expect(result.current[0].id).toBe("1")
  })

  it("respects limit parameter with a query", () => {
    const { result } = renderHook(() => useFuseSearch(items, options, "a", 2))
    expect(result.current).toHaveLength(2)
  })
})
