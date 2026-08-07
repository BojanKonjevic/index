import { describe, expect, it, vi, afterEach } from "vitest"
import { act, cleanup, render, screen } from "@testing-library/react"
import { useOnlineStatus } from "@/hooks/useOnlineStatus"

function Harness() {
  const online = useOnlineStatus()
  return <div data-testid="status">{online ? "online" : "offline"}</div>
}

describe("useOnlineStatus", () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it("starts from navigator.onLine", () => {
    render(<Harness />)
    expect(screen.getByTestId("status").textContent).toBe("online")
  })

  it("flips to offline on the offline event and back on online", () => {
    render(<Harness />)
    act(() => {
      window.dispatchEvent(new Event("offline"))
    })
    expect(screen.getByTestId("status").textContent).toBe("offline")
    act(() => {
      window.dispatchEvent(new Event("online"))
    })
    expect(screen.getByTestId("status").textContent).toBe("online")
  })
})
