import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { I18nProvider } from "@/hooks/useI18n"
import TextViewer from "@/components/TextViewer"
import { languageForUrl, parseCsv, splitSqlBlocks } from "@/lib/codeText"

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

  it("detects markdown and csv by extension", () => {
    expect(languageForUrl("/api/file/x/pitanja.md")).toBe("md")
    expect(languageForUrl("/api/file/x/podaci.csv")).toBe("csv")
  })

  it("falls back to text", () => {
    expect(languageForUrl("/api/file/x/pitanja.txt")).toBe("text")
    expect(languageForUrl("/api/file/x/bez-ekstenzije")).toBe("text")
  })
})

describe("parseCsv", () => {
  it("splits quoted fields with commas", () => {
    expect(parseCsv('a,"b,c"\n1,2')).toEqual([
      ["a", "b,c"],
      ["1", "2"],
    ])
  })

  it("splits tsv on tabs", () => {
    expect(parseCsv("a\tb\n1\t2", "\t")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ])
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
  it("renders one section per task with copy, run and reset buttons", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(SQL))
    renderViewer("/api/file/x/resenja.sql")

    await waitFor(() => {
      expect(screen.getByText("//1 Prikazati sve filmove.")).toBeInTheDocument()
    })
    expect(screen.getByText("//2 Prikazati zanrove.")).toBeInTheDocument()
    // Two task sections, each with copy + run-selected + run-all + reset.
    expect(screen.getAllByRole("button", { name: "Kopiraj kod" })).toHaveLength(2)
    expect(screen.getAllByRole("button", { name: "Pokreni izbor" })).toHaveLength(2)
    expect(screen.getAllByRole("button", { name: "Pokreni sve" })).toHaveLength(2)
    expect(screen.getAllByRole("button", { name: "Resetuj sesiju" })).toHaveLength(2)
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
