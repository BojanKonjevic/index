import { describe, it, expect } from "vitest"
import {
  findAll,
  makeSnippet,
  normalizeSr,
  normalizeWithMap,
  repairDiacritics,
} from "@/lib/normalize"

describe("normalizeSr", () => {
  it("removes diacritics from Serbian characters", () => {
    expect(normalizeSr("čćžšđ")).toBe("cczsd")
  })

  it("lowercases input and handles uppercase Serbian characters", () => {
    expect(normalizeSr("ČĆŽŠĐ")).toBe("cczsd")
  })

  it("leaves ASCII unchanged except case", () => {
    expect(normalizeSr("ABC")).toBe("abc")
  })

  it("handles empty string", () => {
    expect(normalizeSr("")).toBe("")
  })

  it("handles mixed content", () => {
    expect(normalizeSr("Matematička analiza 2")).toBe("matematicka analiza 2")
  })

  it("transliterates Serbian Cyrillic to Latin", () => {
    expect(normalizeSr("Лоранов")).toBe("loranov")
    expect(normalizeSr("Математичка анализа")).toBe("matematicka analiza")
    expect(normalizeSr("Ћирилица")).toBe("cirilica")
    expect(normalizeSr("ШКОЛА")).toBe("skola")
  })

  it("collapses both scripts to the same canonical token", () => {
    expect(normalizeSr("Лоранов")).toBe(normalizeSr("Loranov"))
    expect(normalizeSr("Љубичица")).toBe(normalizeSr("Ljubičica"))
  })

  it("expands Cyrillic digraphs into two Latin chars", () => {
    expect(normalizeSr("Љубав")).toBe("ljubav")
    expect(normalizeSr("Нови Њ")).toBe("novi nj")
    expect(normalizeSr("Џеп")).toBe("dzep")
  })

  it("applies diacritics repair before stripping", () => {
    expect(normalizeSr("Reˇsenje")).toBe("resenje")
    expect(normalizeSr("slede´ce")).toBe("sledece")
  })
})

describe("repairDiacritics", () => {
  it("fixes mark-before-letter corruption", () => {
    expect(repairDiacritics("Reˇsenje")).toBe("Rešenje")
    expect(repairDiacritics("slede´ce")).toBe("sledeće")
    expect(repairDiacritics("ˇcovek")).toBe("čovek")
  })

  it("fixes letter-before-mark order", () => {
    expect(repairDiacritics("Resˇenje")).toBe("Rešenje")
    expect(repairDiacritics("sledec´e")).toBe("sledeće")
  })

  it("handles uppercase variants", () => {
    expect(repairDiacritics("NACˇRT")).toBe("NAČRT")
    expect(repairDiacritics("ˇSema")).toBe("Šema")
    expect(repairDiacritics("PR\u00b4CIP")).toBe("PRĆIP")
  })

  it("drops orphaned marks", () => {
    expect(repairDiacritics("Reˇ ")).toBe("Re ")
    expect(repairDiacritics("café´")).toBe("café")
  })

  it("is a no-op on clean text", () => {
    const clean = "Rešenje i sledeće će biti bolje"
    expect(repairDiacritics(clean)).toBe(clean)
  })

  it("is idempotent", () => {
    const dirty = "Reˇsenje slede´ce NACˇRT"
    const once = repairDiacritics(dirty)
    expect(repairDiacritics(once)).toBe(once)
  })
})

describe("normalizeWithMap", () => {
  it("maps normalized offsets back to original coordinates", () => {
    const { norm, toOrig } = normalizeWithMap("Лоранов")
    expect(norm).toBe("loranov")
    expect(toOrig(0)).toBe(0)
    expect(toOrig(2)).toBe(2)
    expect(toOrig(7)).toBe(7)
  })

  it("maps both chars of a Cyrillic digraph to the same original index", () => {
    const { norm, toOrig } = normalizeWithMap("Љубав")
    expect(norm).toBe("ljubav")
    expect(toOrig(0)).toBe(0)
    expect(toOrig(1)).toBe(0)
    expect(toOrig(2)).toBe(1)
  })

  it("maps a repaired pair to the original pair span", () => {
    const { norm, toOrig } = normalizeWithMap("Reˇsenje")
    expect(norm).toBe("resenje")
    expect(toOrig(2)).toBe(2)
  })
})

describe("findAll", () => {
  it("returns matches in original coordinates", () => {
    expect(findAll("abc loran xyz", "loran")).toEqual([{ start: 4, end: 9 }])
  })

  it("matches Cyrillic text with a Latin query", () => {
    expect(findAll("Лоранов закон", "Loranov")).toEqual([{ start: 0, end: 7 }])
  })

  it("handles digraphs without drifting offsets", () => {
    expect(findAll("Љубичица цвета", "ljubicica")).toEqual([{ start: 0, end: 8 }])
  })

  it("matches after diacritics repair", () => {
    expect(findAll("Reˇsenje je lako", "resenje")).toEqual([{ start: 0, end: 8 }])
  })

  it("finds all non-overlapping occurrences", () => {
    expect(findAll("ana ana ana", "ana")).toEqual([
      { start: 0, end: 3 },
      { start: 4, end: 7 },
      { start: 8, end: 11 },
    ])
  })

  it("returns empty for an empty query", () => {
    expect(findAll("abc", "")).toEqual([])
    expect(findAll("abc", "   ")).toEqual([])
  })
})

describe("makeSnippet", () => {
  it("wraps matches in <mark> using the repaired original text", () => {
    const text = "Ovde je prikazano rešenje jednog primera."
    expect(makeSnippet(text, "resenje")).toContain("<mark>rešenje</mark>")
  })

  it("wraps all matches inside the window", () => {
    const text = "ana i ana i ana"
    expect(makeSnippet(text, "ana", 12)).toContain("<mark>ana</mark>")
  })

  it("centers the window on the first match", () => {
    const text =
      "aaaa bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb loran"
    const snippet = makeSnippet(text, "loran", 40)
    expect(snippet).toContain("<mark>loran</mark>")
    expect(snippet.replace(/<\/?mark>/g, "").length).toBeLessThanOrEqual(40)
  })

  it("returns a plain truncated prefix when there is no match", () => {
    expect(makeSnippet("abcdefghij", "zzz", 5)).toBe("abcde")
  })

  it("renders Cyrillic matches with a Latin query", () => {
    const text = "Лоран је познат по свом делу."
    expect(makeSnippet(text, "loran", 40)).toContain("<mark>Лоран</mark>")
  })

  it("keeps a match longer than the window intact", () => {
    const text = "xx " + "LORANOV".repeat(20) + " yy"
    const snippet = makeSnippet(text, "loranov", 20)
    expect(snippet).toContain("<mark>")
  })
})
