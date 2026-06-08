import { ChevronRight, FileImage, FileText, FileVideo, Layers, Loader2 } from "lucide-react"
import { Link } from "@tanstack/react-router"
import type { MaterialAsset } from "@index/shared"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { useI18n } from "@/hooks/useI18n"

const typeTagStyles: Record<string, { container: string; icon: string }> = {
  pdf: {
    container: "border-[var(--type-pdf-text)] bg-[var(--type-pdf-bg)]",
    icon: "text-[var(--type-pdf-text)]",
  },
  video: {
    container: "border-[var(--type-video-text)] bg-[var(--type-video-bg)]",
    icon: "text-[var(--type-video-text)]",
  },
  image: {
    container: "border-[var(--type-image-text)] bg-[var(--type-image-bg)]",
    icon: "text-[var(--type-image-text)]",
  },
}

const typeIconMap: Record<string, typeof FileText> = {
  pdf: FileText,
  video: FileVideo,
  image: FileImage,
}

export default function ExpandableAssets({
  assets,
  subjectId,
  materialId,
  assetCount,
  onExpand,
  loading = false,
  compact = false,
}: {
  assets?: MaterialAsset[]
  subjectId: string
  materialId: string
  assetCount: number
  onExpand?: () => void
  loading?: boolean
  compact?: boolean
}) {
  const [open, setOpen] = useState(false)
  const { t } = useI18n()

  if (assetCount === 0) return null

  return (
    <div>
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (!open && !assets && onExpand) onExpand()
          setOpen((v) => !v)
        }}
        className={cn(
          "flex w-full items-center gap-1.5 text-left text-[var(--text-hint)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer",
          compact ? "px-2.5 py-1.5 text-[0.688rem]" : "px-2.5 py-2 text-[0.75rem]",
        )}
      >
        <ChevronRight
          className={cn("size-3.5 shrink-0 transition-transform duration-300", open && "rotate-90")}
        />
        {loading ? (
          <Loader2 className="size-3.5 animate-spin shrink-0" />
        ) : (
          <Layers className="size-3.5 shrink-0" />
        )}
        <span>
          {assetCount === 1
            ? t("asset.count", { n: assetCount })
            : t("asset.count_plural", { n: assetCount })}
        </span>
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden min-h-0">
          {loading ? (
            <div
              className={cn(
                "text-[var(--text-hint)]",
                compact ? "px-2.5 py-1.5 text-[0.625rem]" : "px-2.5 py-2 text-[0.688rem]",
              )}
            >
              {t("asset.loading")}
            </div>
          ) : assets && assets.length > 0 ? (
            <div className={cn("flex flex-col gap-0.5 pb-1", !compact && "ml-6")}>
              {assets.map((a, i) => {
                const TypeIcon = typeIconMap[a.fileType] || FileImage
                const ts = typeTagStyles[a.fileType]
                return (
                  <Link
                    key={a.id}
                    to="/subjects/$subjectId/materials/$materialId"
                    params={{ subjectId, materialId }}
                    search={{ asset: String(i + 1) }}
                    className={cn(
                      "flex items-center gap-2.5 rounded-[0.438rem] border border-[var(--border-default)] bg-[var(--bg-surface)] transition-all duration-100 hover:border-[var(--border-strong)]",
                      compact
                        ? "px-2 py-1.5 hover:-translate-y-[0.5px]"
                        : "px-2.5 py-2 hover:-translate-y-0.5",
                    )}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div
                      className={cn(
                        "flex shrink-0 items-center justify-center rounded-[0.313rem] border",
                        ts?.container || "border-[var(--border-default)] bg-[var(--bg-subtle)]",
                        compact ? "size-6" : "size-7",
                      )}
                    >
                      <TypeIcon
                        className={cn(
                          ts?.icon || "text-[var(--text-hint)]",
                          compact ? "size-3" : "size-3.5",
                        )}
                      />
                    </div>
                    <span
                      className={cn(
                        "truncate font-medium leading-tight text-[var(--text-primary)]",
                        compact ? "text-[0.688rem]" : "text-[0.75rem]",
                      )}
                    >
                      {a.name}
                    </span>
                  </Link>
                )
              })}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
