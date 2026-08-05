import { describe, it, expect } from "vitest"
import { timingSafeEqual } from "../routes/auth"

describe("timingSafeEqual", () => {
  it("returns true for identical strings", () => {
    expect(timingSafeEqual("abc123", "abc123")).toBe(true)
  })

  it("returns false for strings differing in one character", () => {
    expect(timingSafeEqual("abc123", "abc124")).toBe(false)
    expect(timingSafeEqual("abc123", "abd123")).toBe(false)
    expect(timingSafeEqual("abc123", "xbc123")).toBe(false)
  })

  it("returns false for strings of different lengths", () => {
    expect(timingSafeEqual("abc", "abcd")).toBe(false)
    expect(timingSafeEqual("abcd", "abc")).toBe(false)
    expect(timingSafeEqual("", "a")).toBe(false)
  })

  it("returns true for empty strings", () => {
    expect(timingSafeEqual("", "")).toBe(true)
  })

  it("returns false for different PBKDF2 hex digests", () => {
    expect(timingSafeEqual("a".repeat(64), "b".repeat(64))).toBe(false)
  })
})
