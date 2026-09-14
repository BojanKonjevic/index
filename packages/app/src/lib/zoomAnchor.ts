// Page-anchored zoom: changing zoom must keep the current page in view
// instead of the current scroll offset (same pixels at a smaller scale point
// much later in the document). Capture the viewport-center page before the
// zoom state commits, restore it in a layout effect after layout updates.

export interface ZoomAnchor {
  pageIndex: number
  frac: number
}

export function captureZoomAnchor(
  scrollTop: number,
  clientHeight: number,
  pageSlot: number,
  numPages: number,
): ZoomAnchor | null {
  if (!(pageSlot > 0) || numPages < 1 || clientHeight <= 0) return null
  const center = scrollTop + clientHeight / 2
  const pageIndex = Math.min(numPages - 1, Math.max(0, Math.floor(center / pageSlot)))
  const frac = (center - pageIndex * pageSlot) / pageSlot
  return { pageIndex, frac }
}

export function restoreZoomAnchor(
  anchor: ZoomAnchor,
  pageSlot: number,
  clientHeight: number,
): number {
  return Math.max(0, anchor.pageIndex * pageSlot + anchor.frac * pageSlot - clientHeight / 2)
}

export function resolveZoomIn(effective: number, step: number, max: number): number {
  return effective * step >= max ? effective : Math.min(effective * step, max)
}

export function resolveZoomOut(effective: number, step: number, min: number): number {
  return effective / step <= min ? effective : Math.max(effective / step, min)
}
