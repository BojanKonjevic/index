import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { I18nProvider } from "@/hooks/useI18n"
import { OfflineBanner } from "@/components/OfflineBanner"

describe("OfflineBanner", () => {
  it("renders the offline notice", () => {
    render(
      <I18nProvider>
        <OfflineBanner />
      </I18nProvider>,
    )
    expect(screen.getByRole("status")).toHaveTextContent(
      "Offline — dostupni su samo preuzeti sadržaji",
    )
  })
})
