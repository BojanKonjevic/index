import "@testing-library/jest-dom/vitest"
import "fake-indexeddb/auto"
import { cleanup } from "@testing-library/react"
import { afterEach, vi } from "vitest"

afterEach(cleanup)

vi.stubGlobal(
  "fetch",
  vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ user: null }),
  }),
)
