let timeoutId: ReturnType<typeof setTimeout> | null = null

export function toggleTheme(current: "light" | "dark"): "light" | "dark" {
  const next = current === "dark" ? "light" : "dark"
  const root = document.documentElement

  if (timeoutId) clearTimeout(timeoutId)

  root.classList.add("theme-transitioning")
  root.setAttribute("data-theme", next)
  localStorage.setItem("theme", next)

  timeoutId = setTimeout(() => {
    root.classList.remove("theme-transitioning")
    timeoutId = null
  }, 380)

  return next
}

export function getInitialTheme(): "light" | "dark" {
  if (typeof document === "undefined") return "light"
  const saved = localStorage.getItem("theme")
  if (saved === "dark" || saved === "light") return saved
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}
