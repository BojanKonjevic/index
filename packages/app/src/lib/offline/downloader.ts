import type { OfflineSubjectPayload } from "@index/shared"
import { fetchApi } from "@/lib/api"
import { getSubjectBundle, removeSubjectBundle, saveSubjectBundle } from "./db"

/** Must match the Workbox runtime cache name in vite.config.ts. */
export const FILES_CACHE = "files"

export interface OfflineDownloadProgress {
  filesDone: number
  filesTotal: number
  bytesDone: number
  /** null when any file lacks a Content-Length header. */
  bytesTotal: number | null
}

export type OfflineDownloadStatus = "running" | "done" | "failed" | "cancelled"

export class OfflineDownloadError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause })
    this.name = "OfflineDownloadError"
  }
}

const CONCURRENCY = 4

export function offlineFileUrls(payload: OfflineSubjectPayload): string[] {
  const urls = new Set<string>()
  for (const material of payload.materials) {
    urls.add(material.url)
    for (const asset of material.assets) urls.add(asset.url)
  }
  return [...urls]
}

function toAbsolute(url: string): string {
  return new URL(url, location.origin).href
}

async function getFilesCache(): Promise<Cache> {
  if (typeof caches === "undefined") {
    throw new OfflineDownloadError("Cache API is not available")
  }
  return caches.open(FILES_CACHE)
}

function abortError(): Error {
  return new DOMException("Download aborted", "AbortError")
}

async function mapConcurrent(
  items: readonly string[],
  limit: number,
  fn: (item: string) => Promise<void>,
): Promise<void> {
  let next = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const item = items[next++]
      await fn(item)
    }
  })
  await Promise.all(workers)
}

async function byteCount(response: Response): Promise<number | null> {
  const cl = response.headers.get("content-length")
  return cl !== null ? Number(cl) : null
}

async function deleteStaleFiles(cache: Cache, keep: string[]): Promise<void> {
  const keepSet = new Set(keep.map(toAbsolute))
  const keys = await cache.keys()
  await Promise.all(
    keys.map(async (key) => {
      const url = typeof key === "string" ? key : key.url
      const pathname = new URL(url, location.origin).pathname
      if (pathname.startsWith("/api/file/") && !keepSet.has(url)) {
        await cache.delete(key)
      }
    }),
  )
}

/**
 * Downloads a subject for offline use: fetches the export bundle, stores it in
 * IndexedDB (marked incomplete until every file is cached), then fetches each
 * file in full (no Range headers) into the Cache API in bounded-concurrency
 * batches so Workbox's RangeRequestsPlugin can always slice complete entries.
 * Already-cached files are skipped, making the job resumable.
 */
export async function downloadSubjectOffline(
  subjectId: string,
  onProgress: (progress: OfflineDownloadProgress) => void,
  signal: AbortSignal,
): Promise<void> {
  const payload = await fetchOfflineSubject(subjectId)
  const urls = offlineFileUrls(payload)
  const cache = await getFilesCache()

  await saveSubjectBundle(subjectId, payload, Date.now(), "incomplete")

  const filesTotal = urls.length
  let filesDone = 0
  let bytesDone = 0
  let bytesKnown = true

  const report = () =>
    onProgress({
      filesDone,
      filesTotal,
      bytesDone,
      bytesTotal: bytesKnown ? bytesDone : null,
    })

  await mapConcurrent(urls, CONCURRENCY, async (url) => {
    if (signal.aborted) throw abortError()
    const absolute = toAbsolute(url)
    const cached = await cache.match(absolute)
    if (cached) {
      const cl = await byteCount(cached)
      if (cl !== null) bytesDone += cl
      else bytesKnown = false
      filesDone++
      report()
      return
    }
    const response = await fetch(absolute, { credentials: "include", signal })
    if (signal.aborted) throw abortError()
    if (!response.ok) {
      throw new OfflineDownloadError(`Failed to download ${url} (HTTP ${response.status})`)
    }
    await cache.put(absolute, response)
    const cl = await byteCount(response)
    if (cl !== null) bytesDone += cl
    else bytesKnown = false
    filesDone++
    report()
  })

  await deleteStaleFiles(cache, urls)
  await saveSubjectBundle(subjectId, payload, Date.now(), "complete")
}

/** Removes the subject's bundle and all of its cached files in one action. */
export async function removeSubjectOffline(subjectId: string): Promise<void> {
  const record = await getSubjectBundle(subjectId)
  await removeSubjectBundle(subjectId)
  if (!record) return
  const cache = await getFilesCache().catch(() => null)
  if (!cache) return
  await Promise.all(offlineFileUrls(record.payload).map((url) => cache.delete(toAbsolute(url))))
}

export function fetchOfflineSubject(subjectId: string): Promise<OfflineSubjectPayload> {
  return fetchApi(`/offline/subject/${subjectId}`)
}
