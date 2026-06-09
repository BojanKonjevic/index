export function toggleTheme(current: "light" | "dark"): "light" | "dark" {
  const next = current === "dark" ? "light" : "dark"
  const root = document.documentElement

  const timeoutId = root.getAttribute("data-theme-timeout")
  if (timeoutId) clearTimeout(Number(timeoutId))

  const overlay = document.createElement("div")
  overlay.className = "theme-sweep-overlay"
  root.appendChild(overlay)

  root.classList.add("theme-transitioning")
  root.setAttribute("data-theme", next)
  localStorage.setItem("theme", next)

  requestAnimationFrame(() => {
    overlay.classList.add("theme-sweep-active")
  })

  const id = setTimeout(() => {
    root.classList.remove("theme-transitioning")
    overlay.remove()
    root.removeAttribute("data-theme-timeout")
  }, 400)

  root.setAttribute("data-theme-timeout", String(id))

  return next
}

export function clearThemeTimeout(): void {
  const timeoutId = document.documentElement.getAttribute("data-theme-timeout")
  if (timeoutId) {
    clearTimeout(Number(timeoutId))
    document.documentElement.removeAttribute("data-theme-timeout")
  }
}

export function getInitialTheme(): "light" | "dark" {
  if (typeof document === "undefined") return "light"
  const saved = localStorage.getItem("theme")
  if (saved === "dark" || saved === "light") return saved
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}
