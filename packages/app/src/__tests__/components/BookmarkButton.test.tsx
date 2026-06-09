import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { I18nProvider } from "@/hooks/useI18n"
import { AuthProvider } from "@/hooks/useAuth"
import { BookmarkProvider } from "@/hooks/useBookmarks"
import { BookmarkButton } from "@/components/BookmarkButton"

function renderButton(id = "test-id") {
  return render(
    <I18nProvider>
      <AuthProvider>
        <BookmarkProvider>
          <BookmarkButton id={id} />
        </BookmarkProvider>
      </AuthProvider>
    </I18nProvider>,
  )
}

describe("BookmarkButton", () => {
  it("renders without crashing", () => {
    renderButton()
    const buttons = screen.getAllByRole("button")
    expect(buttons.length).toBeGreaterThanOrEqual(1)
  })

  it("renders with aria-label for not bookmarked", () => {
    renderButton()
    const buttons = screen.getAllByRole("button")
    const bookmarkBtn = buttons.find((b) => b.getAttribute("aria-label") === "Obeleži")
    expect(bookmarkBtn).toBeDefined()
  })
})
