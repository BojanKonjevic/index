import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { OfflineSubjectPayload } from "@index/shared"
import { I18nProvider } from "@/hooks/useI18n"
import { getSubjectBundles, removeSubjectBundle, saveSubjectBundle } from "@/lib/offline/db"
import { SubjectOfflineControls } from "@/components/SubjectOfflineControls"

class FakeCache implements Cache {
  private entries = new Map<string, Response>()

  async match(request: RequestInfo | URL): Promise<Response | undefined> {
    return this.entries.get(this.keyOf(request))
  }

  async matchAll(): Promise<Response[]> {
    return [...this.entries.values()]
  }

  async add(request: RequestInfo | URL): Promise<void> {
    void request
  }

  async addAll(requests: RequestInfo[]): Promise<void> {
    void requests
  }

  async put(request: RequestInfo | URL, response: Response): Promise<void> {
    this.entries.set(this.keyOf(request), response)
  }

  async delete(request: RequestInfo | URL): Promise<boolean> {
    return this.entries.delete(this.keyOf(request))
  }

  async keys(): Promise<Request[]> {
    return [...this.entries.keys()].map((url) => new Request(url))
  }

  private keyOf(request: RequestInfo | URL): string {
    return typeof request === "string"
      ? request
      : request instanceof Request
        ? request.url
        : request.href
  }
}

function makePayload(materialCount = 2): OfflineSubjectPayload {
  const materials = Array.from({ length: materialCount }, (_, i) => ({
    id: `m${i}`,
    subjectId: "ma2",
    title: `Materijal ${i}`,
    category: "problems" as const,
    examPart: null,
    solved: null,
    fileType: "pdf" as const,
    url: `/api/file/m${i}.pdf`,
    tags: [],
    assets: [],
  }))
  return {
    revision: `2:2026-08-07T10:00:00Z`,
    materialCount,
    subject: {
      id: "ma2",
      name: "Matematička analiza 2",
      semester: 4,
      espb: 8,
      elective: false,
      electiveGroup: null,
      description: "Analiza",
      professors: [],
      assistants: [],
    },
    materials,
    pages: [],
  }
}

function renderControls(materialCount = 2) {
  return render(
    <I18nProvider>
      <SubjectOfflineControls subjectId="ma2" materialCount={materialCount} />
    </I18nProvider>,
  )
}

describe("SubjectOfflineControls", () => {
  beforeEach(async () => {
    for (const bundle of await getSubjectBundles()) {
      await removeSubjectBundle(bundle.subjectId)
    }
    vi.stubGlobal("caches", { open: async () => new FakeCache() })
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes("/offline/subject/")) {
          return new Response(JSON.stringify(makePayload()), {
            status: 200,
            headers: { "content-type": "application/json" },
          })
        }
        return new Response("x", { status: 200, headers: { "content-length": "1" } })
      }),
    )
  })

  it("offers to download when the subject is not downloaded", async () => {
    renderControls()
    await screen.findByRole("button", { name: "Preuzmi offline" })
  })

  it("downloads on click and shows the offline badge with remove", async () => {
    const user = userEvent.setup()
    renderControls()
    const download = await screen.findByRole("button", { name: "Preuzmi offline" })
    await user.click(download)

    await screen.findByText("Offline")
    expect(screen.getByRole("button", { name: "Ukloni sa uređaja" })).toBeInTheDocument()
  })

  it("shows an update hint when the material count changed since download", async () => {
    await saveSubjectBundle("ma2", makePayload(1))
    renderControls(2)
    await screen.findByRole("button", { name: /Novi materijali/ })
  })

  it("offers resume when a previous download was incomplete", async () => {
    await saveSubjectBundle("ma2", makePayload(1), Date.now(), "incomplete")
    renderControls(1)
    await screen.findByRole("button", { name: "Nastavi preuzimanje" })
  })

  it("removes offline data on remove", async () => {
    const user = userEvent.setup()
    await saveSubjectBundle("ma2", makePayload(1))
    renderControls(1)
    await screen.findByText("Offline")

    await user.click(screen.getByRole("button", { name: "Ukloni sa uređaja" }))
    await waitFor(() => expect(screen.queryByText("Offline")).not.toBeInTheDocument())
    await screen.findByRole("button", { name: "Preuzmi offline" })
  })
})
