import { describe, it, expect } from "vitest"
import { normalizeSr } from "@/lib/normalize"

describe("normalizeSr", () => {
  it("removes diacritics from Serbian characters", () => {
    expect(normalizeSr("čćžšđ")).toBe("cczsd")
  })

  it("normalizes uppercase Serbian characters", () => {
    expect(normalizeSr("ČĆŽŠĐ")).toBe("CCZSD")
  })

  it("leaves ASCII unchanged", () => {
    expect(normalizeSr("ABC")).toBe("ABC")
  })

  it("handles empty string", () => {
    expect(normalizeSr("")).toBe("")
  })

  it("handles mixed content", () => {
    expect(normalizeSr("Matematička analiza 2")).toBe("Matematicka analiza 2")
  })
})
