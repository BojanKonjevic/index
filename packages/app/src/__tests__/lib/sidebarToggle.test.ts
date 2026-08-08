import { describe, expect, it } from "vitest"
import { sidebarToggleScrollCompensation } from "@/lib/sidebarToggle"

function verifyCenterPreserved(options: {
  viewportWidth: number
  viewportHeight: number
  scrollLeft: number
  scrollTop: number
  scale: number
  targetWidth: number
}) {
  const { viewportWidth, viewportHeight, scrollLeft, scrollTop, scale, targetWidth } = options
  // The PDF content is scaled about its TOP-LEFT corner. With old total scale
  // s the content point at screen center before the toggle is at content
  // coordinate (scrollLeft + width/2) / s. After the toggle, the content is
  // scaled by the ratio `scale` (s' = s*scale) and re-scrolled; the point must
  // land at the new viewport center. Since s cancels out, use s = 1.
  const contentX = scrollLeft + viewportWidth / 2
  const contentY = scrollTop + viewportHeight / 2

  const { left, top } = sidebarToggleScrollCompensation(options)

  // Screen position after: contentX * s' - scroll offset = contentX*scale - left.
  expect(contentX * scale - left).toBeCloseTo(targetWidth / 2, 6)
  expect(contentY * scale - top).toBeCloseTo(viewportHeight / 2, 6)
}

describe("sidebarToggleScrollCompensation", () => {
  it("preserves the viewport center when the sidebar collapses (expandable width grows)", () => {
    verifyCenterPreserved({
      viewportWidth: 1200,
      viewportHeight: 800,
      scrollLeft: 123,
      scrollTop: 456,
      scale: 1.12,
      targetWidth: 1424,
    })
    verifyCenterPreserved({
      viewportWidth: 800,
      viewportHeight: 600,
      scrollLeft: 9,
      scrollTop: 12,
      scale: 1.28,
      targetWidth: 1024,
    })
  })

  it("preserves the viewport center when the sidebar expands (width shrinks)", () => {
    verifyCenterPreserved({
      viewportWidth: 1424,
      viewportHeight: 800,
      scrollLeft: 77,
      scrollTop: 233,
      scale: 0.89,
      targetWidth: 1200,
    })
  })

  it("does not produce a negative scroll offset", () => {
    const { left } = sidebarToggleScrollCompensation({
      viewportWidth: 1000,
      viewportHeight: 800,
      scrollLeft: 0,
      scrollTop: 0,
      scale: 0.5,
      targetWidth: 1200,
    })
    expect(left).toBe(0)
  })
})
