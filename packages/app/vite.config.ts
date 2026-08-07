import { defineConfig } from "vite"
import react, { reactCompilerPreset } from "@vitejs/plugin-react"
import babel from "@rolldown/plugin-babel"
import tailwindcss from "@tailwindcss/vite"
import { TanStackRouterVite } from "@tanstack/router-plugin/vite"
import { VitePWA } from "vite-plugin-pwa"
import { RangeRequestsPlugin } from "workbox-range-requests"
import path from "path"

// The api route handler runs inside the service worker, but vite.config.ts is
// typechecked with Node libs — declare the web APIs it touches.
declare const caches: {
  open(name: string): Promise<{
    match(request: Request): Promise<Response | undefined>
    put(request: Request, response: Response): Promise<void>
  }>
}

// NetworkFirst with a 3s timeout would wait out the whole timeout on every API
// call when offline. Skip the network entirely when the device is offline and
// serve the last-good cached response immediately.
async function fetchWithTimeout(request: Request, timeoutMs: number) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(request, { signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

export async function apiStrategyHandler({ request }: { request: Request }): Promise<Response> {
  const cache = await caches.open("api")
  const cached = await cache.match(request)
  const offline = (navigator as unknown as { onLine?: boolean }).onLine === false
  if (offline) {
    if (cached) return cached
    throw new Error("Offline and request not cached")
  }
  try {
    const response = await fetchWithTimeout(request, 3000)
    if (response && response.ok) await cache.put(request, response.clone())
    return response
  } catch (error) {
    if (cached) return cached
    throw error
  }
}

export default defineConfig({
  plugins: [
    TanStackRouterVite({ target: "react" }),
    react(),
    babel({
      presets: [reactCompilerPreset({ target: "19" })],
    }),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: false,
      manifest: {
        name: "Indeks",
        short_name: "Indeks",
        display: "standalone",
        start_url: "/",
        theme_color: "#0c0c0c",
        background_color: "#0c0c0c",
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          {
            src: "pwa-maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,mjs,woff2}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // Files (PDFs/images/videos): cache-first; RangeRequestsPlugin slices
            // byte ranges from complete cached responses (react-pdf fetches with
            // Range headers). Entries must be written as full files — ranged reads
            // then always hit complete entries.
            urlPattern: ({ url }) => url.pathname.startsWith("/api/file/"),
            handler: "CacheFirst",
            options: {
              cacheName: "files",
              plugins: [new RangeRequestsPlugin()],
            },
          },
          {
            // API GETs (dashboard, subjects, bookmarks, search): network-first
            // with a 3s timeout, falling back to the last-good cache — except
            // when the device is offline, where cached responses are served
            // immediately instead of waiting out the timeout.
            // Mutations (POST/PUT/DELETE) never match these routes and stay
            // network-only by default.
            urlPattern: ({ url }) => url.pathname.startsWith("/api/"),
            handler: apiStrategyHandler,
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api": "http://localhost:8787",
    },
  },
})
