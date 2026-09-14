import { describe, it, expect } from "vitest"
import {
  captureZoomAnchor,
  restoreZoomAnchor,
  resolveZoomIn,
  resolveZoomOut,
} from "@/lib/zoomAnchor"

describe("captureZoomAnchor", () => {
  it("anchors the page at the viewport center", () => {
    // 100px pages, viewport shows pages 2-3, center in page 2 at 40%.
    const anchor = captureZoomAnchor(220, 100, 100, 10)
    expect(anchor).toEqual({ pageIndex: 2, frac: 0.7 })
  })

  it("clamps to the first and last page", () => {
    expect(captureZoomAnchor(-50, 100, 100, 10)?.pageIndex).toBe(0)
    expect(captureZoomAnchor(5000, 100, 100, 10)?.pageIndex).toBe(9)
  })

  it("returns null for invalid geometry", () => {
    expect(captureZoomAnchor(0, 100, 0, 10)).toBeNull()
    expect(captureZoomAnchor(0, 0, 100, 10)).toBeNull()
    expect(captureZoomAnchor(0, 100, 100, 0)).toBeNull()
  })
})

describe("restoreZoomAnchor", () => {
  it("round-trips a capture at a different scale", () => {
    // Zoomed out: pages are 26px, was on page 7 at 30% in.
    const anchor = captureZoomAnchor(7 * 26 + 0.3 * 26 - 250, 500, 26, 300)
    expect(anchor?.pageIndex).toBe(7)
    // Fit width: pages are 81px. Restored offset centers page 7 again.
    const top = restoreZoomAnchor(anchor!, 81, 500)
    const centerPage = Math.floor((top + 250) / 81)
    expect(centerPage).toBe(7)
  })

  it("never scrolls negative", () => {
    expect(restoreZoomAnchor({ pageIndex: 0, frac: 0 }, 100, 500)).toBe(0)
  })
})

describe("resolveZoomIn / resolveZoomOut", () => {
  it("steps within bounds", () => {
    expect(resolveZoomIn(1, 1.25, 5)).toBe(1.25)
    expect(resolveZoomOut(1, 1.25, 0.1)).toBe(0.8)
  })

  it("holds at the bounds instead of overshooting", () => {
    expect(resolveZoomIn(4.5, 1.25, 5)).toBe(4.5)
    expect(resolveZoomOut(0.11, 1.25, 0.1)).toBe(0.11)
  })
})
