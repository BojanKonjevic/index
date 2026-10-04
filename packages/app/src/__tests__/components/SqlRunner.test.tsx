import { describe, it, expect, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { I18nProvider } from "@/hooks/useI18n"
import { SqlFileView } from "@/components/SqlRunner"

vi.mock("sql.js/dist/sql-wasm.wasm?url", () => ({
  // sql.js reads the wasm off disk in the test env; the ?url asset path
  // Vite emits for the browser is unreadable here. Resolved from the
  // package dir so it works on any checkout.
  default: `${
    (globalThis as { process?: { cwd(): string } }).process?.cwd() ?? "."
  }/node_modules/sql.js/dist/sql-wasm.wasm`,
}))

function renderFile(code: string) {
  return render(
    <I18nProvider>
      <SqlFileView blocks={[{ id: "b0", header: null, code }]} fileName="q.sql" />
    </I18nProvider>,
  )
}

describe("SqlRunner", () => {
  it("disables run-selected without a selection", () => {
    renderFile("SELECT 1;")
    expect(screen.getByRole("button", { name: /Pokreni izbor/ })).toBeDisabled()
    expect(screen.getByRole("button", { name: /Pokreni sve/ })).toBeEnabled()
  })

  it("runs a query and renders the result table", async () => {
    const user = userEvent.setup()
    renderFile(
      "CREATE TABLE t (a); INSERT INTO t VALUES (1); INSERT INTO t VALUES (2); SELECT * FROM t;",
    )
    await user.click(screen.getByRole("button", { name: /Pokreni sve/ }))
    await waitFor(() => expect(screen.getByRole("columnheader", { name: "a" })).toBeInTheDocument())
    expect(screen.getAllByRole("cell", { name: /^[12]$/ })).toHaveLength(2)
  })

  it("runs a selection that returns rows", async () => {
    const user = userEvent.setup()
    renderFile("SELECT 1 AS one;")
    await user.click(screen.getByRole("button", { name: /Pokreni sve/ }))
    expect(await screen.findByRole("columnheader", { name: "one" })).toBeInTheDocument()
    expect(screen.getByRole("cell", { name: "1" })).toBeInTheDocument()
  })

  it("shows engine errors", async () => {
    const user = userEvent.setup()
    renderFile("SELECT * FROM missing;")
    await user.click(screen.getByRole("button", { name: /Pokreni sve/ }))
    await waitFor(() => expect(screen.getByText(/no such table/i)).toBeInTheDocument())
  })

  it("strips task markers from executed text", async () => {
    const user = userEvent.setup()
    renderFile("//9 hello\nSELECT 2 AS two;")
    await user.click(screen.getByRole("button", { name: /Pokreni sve/ }))
    expect(await screen.findByRole("columnheader", { name: "two" })).toBeInTheDocument()
  })

  it("shares one database across blocks of the same file", async () => {
    const user = userEvent.setup()
    render(
      <I18nProvider>
        <SqlFileView
          blocks={[
            { id: "b0", header: null, code: "CREATE TABLE s (a); INSERT INTO s VALUES (7);" },
            { id: "b1", header: null, code: "SELECT * FROM s;" },
          ]}
          fileName="q.sql"
        />
      </I18nProvider>,
    )
    const runButtons = screen.getAllByRole("button", { name: /Pokreni sve/ })
    await user.click(runButtons[0])
    await waitFor(() => expect(screen.getByText("OK", { exact: true })).toBeInTheDocument())
    await user.click(runButtons[1])
    expect(await screen.findByRole("cell", { name: "7" })).toBeInTheDocument()
  })

  it("reset drops session state", async () => {
    const user = userEvent.setup()
    render(
      <I18nProvider>
        <SqlFileView
          blocks={[
            { id: "b0", header: null, code: "CREATE TABLE r (a);" },
            { id: "b1", header: null, code: "SELECT * FROM r;" },
          ]}
          fileName="q.sql"
        />
      </I18nProvider>,
    )
    const runButtons = screen.getAllByRole("button", { name: /Pokreni sve/ })
    await user.click(runButtons[0])
    await waitFor(() => expect(screen.getByText("OK", { exact: true })).toBeInTheDocument())
    await user.click(screen.getAllByRole("button", { name: /Resetuj sesiju/ })[0])
    await user.click(runButtons[1])
    await waitFor(() => expect(screen.getByText(/no such table/i)).toBeInTheDocument())
  })
})
