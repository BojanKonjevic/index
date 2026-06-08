export function Skeleton() {
  return (
    <div className="min-h-screen bg-bg-page">
      <aside className="fixed left-0 top-0 h-screen w-[14rem] flex-col border-r bg-bg-surface border-[var(--border-default)] z-40 hidden md:flex md:flex-col">
        <div className="flex items-center gap-2.5 px-4 py-[1.125rem] pb-3.5 border-b border-[var(--border-faint)]">
          <div className="size-[1.875rem] rounded-[0.5rem] bg-[var(--bg-subtle)] skeleton" />
          <div className="h-4 w-20 rounded bg-[var(--bg-subtle)] skeleton" />
        </div>
        <div className="flex-1 px-2 pt-[0.875rem]">
          <div className="mb-2 px-2">
            <div className="h-2.5 w-16 rounded bg-[var(--bg-subtle)] skeleton" />
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-[0.438rem] px-[0.563rem] py-[0.438rem]"
            >
              <div className="size-[0.938rem] rounded bg-[var(--bg-subtle)] skeleton" />
              <div className="h-3 flex-1 rounded bg-[var(--bg-subtle)] skeleton" />
            </div>
          ))}
          <div className="mt-6 mb-2 px-2">
            <div className="h-2.5 w-14 rounded bg-[var(--bg-subtle)] skeleton" />
          </div>
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-[0.438rem] px-[0.563rem] py-[0.438rem]"
            >
              <div className="size-[0.938rem] rounded bg-[var(--bg-subtle)] skeleton" />
              <div className="h-3 flex-1 rounded bg-[var(--bg-subtle)] skeleton" />
            </div>
          ))}
        </div>
      </aside>
      <main className="ml-0 md:ml-[14rem] min-h-screen pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0">
        <div className="mx-auto max-w-[35rem] md:px-6 md:pt-10 px-4 pt-5">
          <div className="mb-12">
            <div className="h-[2.75rem] w-full rounded-[0.563rem] bg-[var(--bg-subtle)] skeleton" />
          </div>
          <div className="mb-3.5 flex items-center gap-3">
            <div className="h-2.5 w-28 rounded bg-[var(--bg-subtle)] skeleton" />
            <div className="h-px flex-1 bg-[var(--border-faint)]" />
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="mb-2 flex items-center gap-3 rounded-[0.563rem] border border-[var(--border-default)] bg-bg-surface px-3.5 py-2.5"
            >
              <div className="size-9 rounded-[0.438rem] bg-[var(--bg-subtle)] skeleton" />
              <div className="flex-1">
                <div className="mb-1 h-3 w-3/4 rounded bg-[var(--bg-subtle)] skeleton" />
                <div className="h-2.5 w-1/3 rounded bg-[var(--bg-subtle)] skeleton" />
              </div>
            </div>
          ))}
        </div>
      </main>
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-14 items-center border-t bg-bg-surface border-[var(--border-default)] pb-safe md:hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-1 flex-col items-center justify-center gap-0.5">
            <div className="size-[1.125rem] rounded bg-[var(--bg-subtle)] skeleton" />
          </div>
        ))}
      </nav>
    </div>
  )
}
