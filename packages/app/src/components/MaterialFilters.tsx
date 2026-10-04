import { useI18n } from "@/hooks/useI18n"
import type { FileText } from "lucide-react"

interface MaterialFiltersProps {
  fileTypeFilter: string
  setFileTypeFilter: (v: string) => void
  categoryFilter: string
  setCategoryFilter: (v: string) => void
  categoryConfig: Record<string, { label: string; icon: typeof FileText }>
  onFilter?: () => void
  variant?: "desktop" | "mobile"
}

const fileTypeOptions = (t: (key: string) => string): { key: string; label: string }[] => [
  { key: "all", label: t("subject.filter_all") },
  { key: "pdf", label: "PDF" },
  { key: "text", label: t("materialType.text") },
  { key: "html", label: "HTML" },
  { key: "video", label: "Video" },
  { key: "image", label: t("materialType.image") },
]

const categoryOptions = (
  t: (key: string) => string,
  categoryConfig: Record<string, { label: string; icon: typeof FileText }>,
): { key: string; label: string }[] => [
  { key: "all", label: t("subject.filter_all_cat") },
  ...Object.keys(categoryConfig).map((c) => ({ key: c, label: categoryConfig[c].label })),
]

export function MaterialFilters({
  fileTypeFilter,
  setFileTypeFilter,
  categoryFilter,
  setCategoryFilter,
  categoryConfig,
  onFilter,
  variant = "desktop",
}: MaterialFiltersProps) {
  const { t } = useI18n()

  const tabClass = (active: boolean) =>
    `shrink-0 cursor-pointer border-b-2 px-1 py-1.5 text-[0.75rem] transition-colors duration-100 ${
      active
        ? "border-[var(--accent)] font-medium text-[var(--text-primary)]"
        : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
    }`

  const renderGroup = (
    label: string,
    options: { key: string; label: string }[],
    current: string,
    onPick: (key: string) => void,
    wrap = false,
  ) => (
    <div className="flex min-w-0 flex-col gap-0.5">
      <div className="text-[0.625rem] font-semibold uppercase tracking-[0.05rem] text-[var(--text-hint)]">
        {label}
      </div>
      <div
        className={`flex gap-x-4 gap-y-0.5 ${wrap ? "flex-wrap" : "overflow-x-auto no-scrollbar"}`}
      >
        {options.map((opt) => (
          <button
            key={opt.key}
            onClick={() => onPick(opt.key)}
            aria-pressed={current === opt.key}
            className={tabClass(current === opt.key)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )

  const handleFileType = (key: string) => {
    setFileTypeFilter(key)
    onFilter?.()
  }

  const handleCategory = (key: string) => {
    setCategoryFilter(key)
    onFilter?.()
  }

  if (variant === "mobile") {
    return (
      <div className="flex flex-col gap-3">
        {renderGroup(
          t("subject.filter_file_type"),
          fileTypeOptions(t),
          fileTypeFilter,
          handleFileType,
          true,
        )}
        {renderGroup(
          t("subject.filter_category"),
          categoryOptions(t, categoryConfig),
          categoryFilter,
          handleCategory,
          true,
        )}
      </div>
    )
  }

  return (
    <div className="hidden md:flex flex-wrap items-start gap-x-8 gap-y-2">
      {renderGroup(
        t("subject.filter_file_type"),
        fileTypeOptions(t),
        fileTypeFilter,
        handleFileType,
      )}
      {renderGroup(
        t("subject.filter_category"),
        categoryOptions(t, categoryConfig),
        categoryFilter,
        handleCategory,
      )}
    </div>
  )
}
