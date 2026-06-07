let timeoutId: ReturnType<typeof setTimeout> | null = null

export function toggleTheme(current: "light" | "dark"): "light" | "dark" {
  const next = current === "dark" ? "light" : "dark"
  const root = document.documentElement

  if (timeoutId) clearTimeout(timeoutId)

  const overlay = document.createElement("div")
  overlay.className = "theme-sweep-overlay"
  root.appendChild(overlay)

  root.classList.add("theme-transitioning")
  root.setAttribute("data-theme", next)
  localStorage.setItem("theme", next)

  requestAnimationFrame(() => {
    overlay.classList.add("theme-sweep-active")
  })

  timeoutId = setTimeout(() => {
    root.classList.remove("theme-transitioning")
    overlay.remove()
    timeoutId = null
  }, 400)

  return next
}

export function getInitialTheme(): "light" | "dark" {
  if (typeof document === "undefined") return "light"
  const saved = localStorage.getItem("theme")
  if (saved === "dark" || saved === "light") return saved
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}
