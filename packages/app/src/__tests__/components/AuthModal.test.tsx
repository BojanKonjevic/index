import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { I18nProvider } from "@/hooks/useI18n"
import { AuthProvider } from "@/hooks/useAuth"
import { AuthModal } from "@/components/AuthModal"

function renderModal(open = true) {
  return render(
    <I18nProvider>
      <AuthProvider>
        <AuthModal open={open} onClose={() => {}} />
      </AuthProvider>
    </I18nProvider>,
  )
}

describe("AuthModal", () => {
  it("renders nothing when closed", () => {
    const { container } = renderModal(false)
    expect(container.innerHTML).toBe("")
  })

  it("renders login form when open", () => {
    renderModal(true)
    const buttons = screen.getAllByText("Prijavi se")
    expect(buttons.length).toBeGreaterThanOrEqual(1)
  })

  it("renders username label when open", () => {
    renderModal(true)
    const labels = screen.getAllByText("Korisničko ime")
    expect(labels.length).toBeGreaterThanOrEqual(1)
  })
})
