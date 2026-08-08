import { Download, Loader2, RefreshCw, Trash2, X } from "lucide-react"
import { useI18n } from "@/hooks/useI18n"
import { useOfflineDownloads } from "@/hooks/useOfflineDownloads"
import { OfflineBadge } from "@/components/OfflineBadge"
import { cn } from "@/lib/utils"

interface Props {
  subjectId: string
  /** Live revision of the subject (same format as the offline bundle's),
   *  used to detect stale downloads. Count alone cannot: removing one material
   *  and adding another leaves the count unchanged. */
  revision: string
  className?: string
}

export function SubjectOfflineControls({ subjectId, revision, className }: Props) {
  const { t } = useI18n()
  const { jobs, bundles, startDownload, cancelDownload, removeOffline } = useOfflineDownloads()

  const job = jobs[subjectId]
  const bundle = bundles.find((b) => b.subjectId === subjectId)
  const stale = bundle !== undefined && bundle.revision !== revision
  // Known gap: a PDF replaced in place (same material row, same created_at)
  // leaves the revision unchanged, so offline copies can go silently stale;
  // out of scope per the plan (§2.2 "Not offline").

  const buttonClass =
    "inline-flex items-center gap-1.5 rounded-[0.5rem] border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 text-[0.813rem] text-[var(--text-secondary)] transition-colors duration-100 hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] cursor-pointer"

  if (job?.status === "running") {
    return (
      <div className={cn("flex flex-wrap items-center gap-2", className)}>
        <span className="inline-flex items-center gap-1.5 text-[0.813rem] text-[var(--text-secondary)]">
          <Loader2 className="size-4 animate-spin" />
          {t("offline.downloading")}
          {" · "}
          {t("offline.progress_fmt", {
            done: job.progress?.filesDone ?? 0,
            total: job.progress?.filesTotal ?? 0,
          })}
        </span>
        <button onClick={() => cancelDownload(subjectId)} className={buttonClass}>
          <X className="size-4" />
          {t("offline.cancel")}
        </button>
      </div>
    )
  }

  if (job?.status === "failed") {
    return (
      <div className={cn("flex flex-wrap items-center gap-2", className)}>
        <span className="text-[0.813rem] text-[var(--status-soon-text)]">
          {t("offline.failed")}
          {job.error ? <span className="ml-1 text-[var(--text-hint)]">({job.error})</span> : null}
        </span>
        <button onClick={() => void startDownload(subjectId)} className={buttonClass}>
          <Download className="size-4" />
          {t("error.retry")}
        </button>
      </div>
    )
  }

  if (bundle) {
    const complete = bundle.status === "complete"
    return (
      <div className={cn("flex flex-wrap items-center gap-2", className)}>
        {complete ? (
          <>
            <OfflineBadge />
            {stale && (
              <button onClick={() => void startDownload(subjectId)} className={buttonClass}>
                <RefreshCw className="size-4" />
                {t("offline.update_hint")}
              </button>
            )}
          </>
        ) : (
          <button onClick={() => void startDownload(subjectId)} className={buttonClass}>
            <Download className="size-4" />
            {t("offline.resume")}
          </button>
        )}
        <button onClick={() => void removeOffline(subjectId)} className={buttonClass}>
          <Trash2 className="size-4" />
          {t("offline.remove")}
        </button>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <button onClick={() => void startDownload(subjectId)} className={buttonClass}>
        <Download className="size-4" />
        {job?.status === "cancelled" ? t("offline.resume") : t("offline.download")}
      </button>
    </div>
  )
}
