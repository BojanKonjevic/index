import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { createRouter, RouterProvider } from "@tanstack/react-router"
import { routeTree } from "./routeTree.gen"
import { I18nProvider } from "@/hooks/useI18n"
import { FILES_CACHE } from "@/lib/offline/cacheNames"
import "./index.css"

const savedTheme = localStorage.getItem("theme")
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
document.documentElement.setAttribute("data-theme", savedTheme ?? (prefersDark ? "dark" : "light"))

const router = createRouter({ routeTree })

// One-shot cleanup of superseded files caches. The files cache is pure
// cache-first with no revalidation, so after a rename the old caches would
// otherwise pin stale file bytes on disk forever. Deletes every files*
// cache except the current one, then records the current name so this runs
// once per profile per rename.
try {
  if (localStorage.getItem("files-cache-cleanup") !== FILES_CACHE) {
    if ("caches" in window) {
      void caches
        .keys()
        .then((names) => {
          const stale = names.filter(
            (name) => name !== FILES_CACHE && (name === "files" || name.startsWith("files-v")),
          )
          return Promise.all(stale.map((name) => caches.delete(name)))
        })
        .then(
          () => localStorage.setItem("files-cache-cleanup", FILES_CACHE),
          () => {},
        )
    } else {
      localStorage.setItem("files-cache-cleanup", FILES_CACHE)
    }
  }
} catch {
  /* Storage or cache API unavailable: in private mode both are memory
   * backed and die with the tab, so there is nothing durable to clean. */
}

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
