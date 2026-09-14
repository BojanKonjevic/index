import { defineConfig, devices } from "@playwright/test"

// Smoke tests run against the deployed app by default so they verify the
// thing recruiters actually open. Point E2E_BASE_URL at a local dev server
// to run them against uncommitted changes:
//
//   E2E_BASE_URL=http://localhost:5173 pnpm test:e2e
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "https://ftn-index.bojan-dev.workers.dev",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
})
