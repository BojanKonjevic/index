import { describe, it, expect } from "vitest"
import { buildFtsQuery } from "@index/shared"

describe("buildFtsQuery", () => {
  it("wraps a single token with a prefix wildcard", () => {
    expect(buildFtsQuery("loran")).toBe('"loran"*')
  })

  it("normalizes Serbian diacritics and Cyrillic", () => {
    expect(buildFtsQuery("Rešenje")).toBe('"resenje"*')
    expect(buildFtsQuery("Ћирилица")).toBe('"cirilica"*')
  })

  it("joins multiple tokens with AND", () => {
    expect(buildFtsQuery("matematicka analiza")).toBe('"matematicka"* AND "analiza"*')
  })

  it("drops one-character tokens", () => {
    expect(buildFtsQuery("a analiza")).toBe('"analiza"*')
    expect(buildFtsQuery("matematicka 2")).toBe('"matematicka"*')
  })

  it("keeps two-character alnum tokens", () => {
    expect(buildFtsQuery("ma2")).toBe('"ma2"*')
  })

  it("returns null for empty and whitespace-only queries", () => {
    expect(buildFtsQuery("")).toBeNull()
    expect(buildFtsQuery("   ")).toBeNull()
    expect(buildFtsQuery("\n\t")).toBeNull()
  })

  it("returns null for symbols-only queries", () => {
    expect(buildFtsQuery("???")).toBeNull()
    expect(buildFtsQuery("!!!")).toBeNull()
    expect(buildFtsQuery("---")).toBeNull()
  })

  it("returns null for a single character", () => {
    expect(buildFtsQuery("l")).toBeNull()
  })

  it("rejects tokens containing FTS operators instead of leaking them", () => {
    expect(buildFtsQuery('"loran')).toBeNull()
    expect(buildFtsQuery("loran*")).toBeNull()
    expect(buildFtsQuery("NEAR(loran loran)")).toBeNull()
  })

  it("keeps surviving alnum tokens when others are rejected", () => {
    expect(buildFtsQuery("loran -napred")).toBe('"loran"*')
  })

  it("caps at 8 surviving tokens", () => {
    const query = "ab cd ef gh ij kl mn op qr st"
    expect(buildFtsQuery(query)).toBe(
      '"ab"* AND "cd"* AND "ef"* AND "gh"* AND "ij"* AND "kl"* AND "mn"* AND "op"*',
    )
  })

  it("truncates a single very long token", () => {
    const out = buildFtsQuery("a".repeat(200))
    expect(out).toBe(`"${"a".repeat(64)}"*`)
  })
})
