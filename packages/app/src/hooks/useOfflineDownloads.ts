import { useCallback, useEffect, useRef, useState } from "react"
import { getSubjectBundles } from "@/lib/offline/db"
import {
  downloadSubjectOffline,
  removeSubjectOffline,
  type OfflineDownloadProgress,
  type OfflineDownloadStatus,
} from "@/lib/offline/downloader"

export interface OfflineJob {
  subjectId: string
  status: OfflineDownloadStatus
  progress: OfflineDownloadProgress | null
  error: string | null
}

export function useOfflineDownloads() {
  const [jobs, setJobs] = useState<Record<string, OfflineJob>>({})
  const [downloaded, setDownloaded] = useState<string[]>([])
  const controllers = useRef(new Map<string, AbortController>())

  const refreshDownloaded = useCallback(async () => {
    const bundles = await getSubjectBundles()
    setDownloaded(bundles.map((bundle) => bundle.subjectId))
  }, [])

  useEffect(() => {
    void refreshDownloaded()
  }, [refreshDownloaded])

  const startDownload = useCallback(
    async (subjectId: string) => {
      if (controllers.current.has(subjectId)) return
      const controller = new AbortController()
      controllers.current.set(subjectId, controller)
      setJobs((jobs) => ({
        ...jobs,
        [subjectId]: {
          subjectId,
          status: "running",
          progress: { filesDone: 0, filesTotal: 0, bytesDone: 0, bytesTotal: null },
          error: null,
        },
      }))
      try {
        await downloadSubjectOffline(
          subjectId,
          (progress) => {
            setJobs((jobs) => ({
              ...jobs,
              [subjectId]: { ...jobs[subjectId], progress },
            }))
          },
          controller.signal,
        )
        setJobs((jobs) => ({
          ...jobs,
          [subjectId]: { subjectId, status: "done", progress: null, error: null },
        }))
        await refreshDownloaded()
      } catch (error) {
        const status: OfflineDownloadStatus =
          error instanceof DOMException && error.name === "AbortError" ? "cancelled" : "failed"
        setJobs((jobs) => ({
          ...jobs,
          [subjectId]: {
            subjectId,
            status,
            progress: jobs[subjectId]?.progress ?? null,
            error: error instanceof Error ? error.message : String(error),
          },
        }))
      } finally {
        controllers.current.delete(subjectId)
      }
    },
    [refreshDownloaded],
  )

  const cancelDownload = useCallback((subjectId: string) => {
    controllers.current.get(subjectId)?.abort()
  }, [])

  const removeOffline = useCallback(
    async (subjectId: string) => {
      if (controllers.current.has(subjectId)) return
      await removeSubjectOffline(subjectId)
      await refreshDownloaded()
    },
    [refreshDownloaded],
  )

  return {
    jobs,
    downloaded,
    isDownloaded: (subjectId: string) => downloaded.includes(subjectId),
    startDownload,
    cancelDownload,
    removeOffline,
  }
}
