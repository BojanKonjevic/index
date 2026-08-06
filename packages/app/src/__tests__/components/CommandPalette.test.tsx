import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor, cleanup } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { I18nProvider } from "@/hooks/useI18n"
import { SearchPaletteProvider, useSearchPalette } from "@/hooks/useSearchPalette"
import CommandPalette from "@/components/CommandPalette"

vi.mock("@tanstack/react-router", () => ({
  useLocation: () => ({ pathname: "/" }),
  useNavigate: () => vi.fn(),
}))

const dashboard = {
  subjects: [{ id: "ma2", name: "Matematička analiza 2", semester: 4, espb: 8, materialCount: 1 }],
  materials: [
    {
      id: "ma2-vezbe-12",
      subjectId: "ma2",
      title: "Loranov red — vežbe",
      category: "problems",
      examPart: null,
      solved: null,
      fileType: "pdf",
      url: "/api/file/ma2/vezbe-12.pdf",
      tags: [],
      assets: [],
    },
  ],
  exams: [],
  subjectNameMap: { ma2: "Matematička analiza 2" },
}

const contentResponse = {
  content: {
    total: 1,
    hasMore: false,
    items: [
      {
        materialId: "ma2-vezbe-12",
        subjectId: "ma2",
        subjectName: "Matematička analiza 2",
        title: "Loranov red — vežbe",
        fileType: "pdf",
        hits: 3,
        pages: [{ page: 4, snippet: "<mark>loran</mark> red je tema vežbi" }],
      },
    ],
  },
}

function ok(body: unknown) {
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) })
}

function renderPalette() {
  function Harness() {
    const { openPalette } = useSearchPalette()
    return (
      <>
        <button onClick={openPalette}>Open palette</button>
        <CommandPalette />
      </>
    )
  }
  return render(
    <I18nProvider>
      <SearchPaletteProvider>
        <Harness />
      </SearchPaletteProvider>
    </I18nProvider>,
  )
}

let fetchMock: ReturnType<typeof vi.fn>

describe("CommandPalette", () => {
  beforeEach(() => {
    fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes("/search")) return ok(contentResponse)
      return ok(dashboard)
    })
    vi.stubGlobal("fetch", fetchMock)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it("is closed by default and opens on trigger, focusing the input", async () => {
    const user = userEvent.setup()
    renderPalette()
    expect(screen.queryByRole("dialog")).toBeNull()
    await user.click(screen.getByRole("button", { name: "Open palette" }))
    const input = screen.getByRole("textbox")
    expect(input).toBeInTheDocument()
    expect(input).toHaveFocus()
  })

  it("shows metadata matches for a query", async () => {
    const user = userEvent.setup()
    renderPalette()
    await user.click(screen.getByRole("button", { name: "Open palette" }))
    await user.type(screen.getByRole("textbox"), "matem")
    await waitFor(() => {
      expect(screen.getAllByText("Matematička analiza 2").length).toBeGreaterThan(0)
    })
  })

  it("fetches and renders content hits with marked snippets", async () => {
    const user = userEvent.setup()
    renderPalette()
    await user.click(screen.getByRole("button", { name: "Open palette" }))
    await user.type(screen.getByRole("textbox"), "loran")
    await waitFor(() => {
      const urls = fetchMock.mock.calls.map((c) => String(c[0]))
      expect(urls.some((u) => u.includes("/search?") && u.includes("q=loran"))).toBe(true)
    })
    await waitFor(() => {
      expect(screen.getByText("3 pogodaka")).toBeInTheDocument()
      expect(document.querySelector(".search-hit-container mark")).toBeTruthy()
    })
  })

  it("closes on Escape when the query is empty", async () => {
    const user = userEvent.setup()
    renderPalette()
    await user.click(screen.getByRole("button", { name: "Open palette" }))
    expect(screen.getByRole("textbox")).toBeInTheDocument()
    await user.keyboard("{Escape}")
    await waitFor(() => {
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument()
    })
  })
})
