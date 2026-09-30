import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { I18nProvider } from "@/hooks/useI18n"
import TextViewer from "@/components/TextViewer"
import { languageForUrl, splitSqlBlocks } from "@/lib/codeText"

const SQL = `//1 Prikazati sve filmove.
select idf from film;

//2 Prikazati zanrove.
select idz from zanr;`

function renderViewer(url: string) {
  return render(
    <I18nProvider>
      <TextViewer url={url} />
    </I18nProvider>,
  )
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn())
})

describe("languageForUrl", () => {
  it("detects sql by extension", () => {
    expect(languageForUrl("/api/file/x/resenja.sql")).toBe("sql")
    expect(languageForUrl("/api/file/x/NOTES.SQL")).toBe("sql")
  })

  it("detects python by extension", () => {
    expect(languageForUrl("/api/file/x/resenje.py")).toBe("python")
  })

  it("falls back to text", () => {
    expect(languageForUrl("/api/file/x/pitanja.txt")).toBe("text")
    expect(languageForUrl("/api/file/x/bez-ekstenzije")).toBe("text")
  })
})

describe("splitSqlBlocks", () => {
  it("splits on numbered task comments", () => {
    const blocks = splitSqlBlocks(SQL)
    expect(blocks).toHaveLength(2)
    expect(blocks[0].header).toBe("//1 Prikazati sve filmove.")
    expect(blocks[0].code).toContain("select idf from film;")
    expect(blocks[1].header).toBe("//2 Prikazati zanrove.")
  })

  it("keeps files without task comments whole", () => {
    const blocks = splitSqlBlocks("insert into t values (1);")
    expect(blocks).toHaveLength(1)
    expect(blocks[0].header).toBeNull()
  })
})

describe("TextViewer", () => {
  it("renders one section per task with its own copy button", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(SQL))
    renderViewer("/api/file/x/resenja.sql")

    await waitFor(() => {
      expect(screen.getByText("//1 Prikazati sve filmove.")).toBeInTheDocument()
    })
    expect(screen.getByText("//2 Prikazati zanrove.")).toBeInTheDocument()
    expect(screen.getAllByRole("button").filter((b) => b.getAttribute("aria-label"))).toHaveLength(
      2,
    )
  })

  it("highlights sql keywords and escapes plain text", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(SQL))
    const { unmount } = renderViewer("/api/file/x/resenja.sql")
    await waitFor(() => {
      expect(document.querySelector(".hljs-keyword")).not.toBeNull()
    })
    unmount()

    vi.mocked(fetch).mockResolvedValueOnce(new Response("<b>pitanje</b>"))
    renderViewer("/api/file/x/pitanja.txt")
    await waitFor(() => {
      expect(screen.getByText("<b>pitanje</b>")).toBeInTheDocument()
    })
    expect(document.querySelector("b")).toBeNull()
  })

  it("shows an error state when the fetch fails", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("down"))
    renderViewer("/api/file/x/resenja.sql")
    await waitFor(() => {
      expect(screen.getByText("Učitavanje fajla nije uspelo.")).toBeInTheDocument()
    })
  })
})
