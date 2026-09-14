import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { createRouter, RouterProvider } from "@tanstack/react-router"
import { routeTree } from "./routeTree.gen"
import { I18nProvider } from "@/hooks/useI18n"
import "./index.css"

const savedTheme = localStorage.getItem("theme")
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
document.documentElement.setAttribute("data-theme", savedTheme ?? (prefersDark ? "dark" : "light"))

const router = createRouter({ routeTree })

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nProvider>
      <RouterProvider router={router} />
    </I18nProvider>
  </StrictMode>,
)

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js").then((registration) => {
      // Without this, an updated worker stalls in "waiting" while any tab
      // is open and users stay on the old build indefinitely.
      registration.addEventListener("updatefound", () => {
        const worker = registration.installing
        if (!worker) return
        worker.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            worker.postMessage({ type: "SKIP_WAITING" })
          }
        })
      })
    })
  })
  let refreshing = false
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return
    refreshing = true
    window.location.reload()
  })
}
