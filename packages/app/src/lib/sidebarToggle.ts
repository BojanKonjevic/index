export interface SidebarToggleScrollInput {
  viewportWidth: number
  viewportHeight: number
  scrollLeft: number
  scrollTop: number
  scale: number
  targetWidth: number
}

export function sidebarToggleScrollCompensation({
  viewportWidth,
  viewportHeight,
  scrollLeft,
  scrollTop,
  scale,
  targetWidth,
}: SidebarToggleScrollInput): { left: number; top: number } {
  const anchorX = viewportWidth / 2
  const anchorY = viewportHeight / 2
  return {
    left: Math.max(0, (scrollLeft + anchorX) * scale - targetWidth / 2),
    top: Math.max(0, (scrollTop + anchorY) * scale - anchorY),
  }
}
