import "@testing-library/jest-dom/vitest"
import "fake-indexeddb/auto"
import { vi } from "vitest"

vi.stubGlobal(
  "fetch",
  vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ user: null }),
  }),
)
