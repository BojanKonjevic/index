import { useI18n } from "@/hooks/useI18n"
import { CATEGORY_ORDER } from "@index/shared"
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
  { key: "video", label: "Video" },
  { key: "image", label: t("materialType.image") },
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

  const btnClass = (active: boolean) =>
    `rounded-full border px-2.5 py-1 text-[0.75rem] transition-all duration-100 ${
      variant === "mobile" ? "px-3 py-1.5" : ""
    } ${
      active
        ? "border-[var(--accent)] bg-[var(--accent-bg)] text-[var(--accent-strong)] font-medium"
        : "border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-subtle)]"
    }`

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
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-[0.625rem] font-semibold uppercase tracking-[0.05rem] text-[var(--text-hint)]">
            {t("subject.filter_file_type")}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {fileTypeOptions(t).map((opt) => (
              <button
                key={opt.key}
                onClick={() => handleFileType(opt.key)}
                className={btnClass(fileTypeFilter === opt.key)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[0.625rem] font-semibold uppercase tracking-[0.05rem] text-[var(--text-hint)]">
            {t("subject.filter_category")}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {[
              { key: "all", label: t("subject.filter_all_cat") },
              ...CATEGORY_ORDER.map((c) => ({ key: c, label: categoryConfig[c].label })),
            ].map((opt) => (
              <button
                key={opt.key}
                onClick={() => handleCategory(opt.key)}
                className={btnClass(categoryFilter === opt.key)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="hidden md:flex flex-wrap items-start gap-6">
      <div className="flex flex-col gap-1.5">
        <div className="text-[0.625rem] font-semibold uppercase tracking-[0.05rem] text-[var(--text-hint)]">
          {t("subject.filter_file_type")}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {fileTypeOptions(t).map((opt) => (
            <button
              key={opt.key}
              onClick={() => handleFileType(opt.key)}
              className={btnClass(fileTypeFilter === opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="text-[0.625rem] font-semibold uppercase tracking-[0.05rem] text-[var(--text-hint)]">
          {t("subject.filter_category")}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[
            { key: "all", label: t("subject.filter_all_cat") },
            ...CATEGORY_ORDER.map((c) => ({ key: c, label: categoryConfig[c].label })),
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => handleCategory(opt.key)}
              className={btnClass(categoryFilter === opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
