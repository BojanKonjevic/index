import { defineConfig } from "vite"
import react, { reactCompilerPreset } from "@vitejs/plugin-react"
import babel from "@rolldown/plugin-babel"
import tailwindcss from "@tailwindcss/vite"
import { TanStackRouterVite } from "@tanstack/router-plugin/vite"
import { VitePWA } from "vite-plugin-pwa"
import { RangeRequestsPlugin } from "workbox-range-requests"
import path from "path"

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
            // API GETs (dashboard, subjects, bookmarks, search): network-first with
            // a short timeout, falling back to the last-good cache offline.
            // Mutations (POST/PUT/DELETE) never match these routes and stay
            // network-only by default.
            urlPattern: ({ url }) => url.pathname.startsWith("/api/"),
            handler: "NetworkFirst",
            options: {
              cacheName: "api",
              networkTimeoutSeconds: 3,
            },
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
