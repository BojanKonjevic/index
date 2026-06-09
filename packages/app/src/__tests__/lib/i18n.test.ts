import { describe, it, expect, vi, afterEach } from "vitest"
import { formatDate, getRelativeTime } from "@/lib/i18n"

describe("formatDate", () => {
  it("returns sr format", () => {
    expect(formatDate("sr", "2025-06-09")).toBe("9. jun")
  })

  it("returns en format", () => {
    expect(formatDate("en", "2025-06-09")).toBe("9. June")
  })
})

describe("getRelativeTime", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns "upravo" for sr locale when less than a minute', () => {
    vi.useFakeTimers()
    const now = Date.now()
    expect(getRelativeTime("sr", now - 10_000)).toBe("upravo")
  })

  it('returns "just now" for en locale when less than a minute', () => {
    vi.useFakeTimers()
    const now = Date.now()
    expect(getRelativeTime("en", now - 10_000)).toBe("just now")
  })

  it("returns minutes ago for sr", () => {
    vi.useFakeTimers()
    const now = Date.now()
    const fiveMinAgo = now - 5 * 60 * 1000
    expect(getRelativeTime("sr", fiveMinAgo)).toBe("pre 5 min")
  })

  it("returns minutes ago for en", () => {
    vi.useFakeTimers()
    const now = Date.now()
    const fiveMinAgo = now - 5 * 60 * 1000
    expect(getRelativeTime("en", fiveMinAgo)).toBe("5 min ago")
  })
})
