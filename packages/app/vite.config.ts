import { defineConfig } from "vite"
import react, { reactCompilerPreset } from "@vitejs/plugin-react"
import babel from "@rolldown/plugin-babel"
import tailwindcss from "@tailwindcss/vite"
import { TanStackRouterVite } from "@tanstack/router-plugin/vite"
import { VitePWA } from "vite-plugin-pwa"
import { RangeRequestsPlugin } from "workbox-range-requests"
import { FILES_CACHE, API_CACHE } from "./src/lib/offline/cacheNames"
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
// call when offline. Serve the last-good cached response immediately when the
// device reports offline — but navigator.onLine can be stale inside a service
// worker (evaluated at SW start and not always updated until the SW is
// destroyed), so it must never be a hard gate: if nothing is cached, fall
// through to a real fetch attempt, which fails fast when truly offline.
//
// NOTE: workbox-build inlines this handler into sw.js but drops module-scope
// identifiers it references (they are not defined in the generated SW scope),
// so everything it needs must live inside the handler body itself.
export async function apiStrategyHandler({ request }: { request: Request }): Promise<Response> {
  const fetchWithTimeout = async (req: Request, timeoutMs: number) => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    try {
      return await fetch(req, { signal: controller.signal })
    } finally {
      clearTimeout(timeout)
    }
  }
  const cache = await caches.open("api")
  const cached = await cache.match(request)
  const offline = (navigator as unknown as { onLine?: boolean }).onLine === false
  if (offline && cached) {
    return cached
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

// The handler above is serialized into sw.js verbatim, so its cache name must
// stay a literal inside the body. Fail the build instead of silently letting
// the two copies drift.
if (!apiStrategyHandler.toString().includes(`caches.open("${API_CACHE}")`)) {
  throw new Error(`apiStrategyHandler must reference API_CACHE ("${API_CACHE}") as a literal`)
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
              cacheName: FILES_CACHE,
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
