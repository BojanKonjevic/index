import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import path from "path"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: "happy-dom",
    setupFiles: ["./src/test-setup.ts"],
    // Playwright specs run under `pnpm test:e2e`, never vitest.
    exclude: ["e2e/**", "node_modules/**"],
  },
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
})
