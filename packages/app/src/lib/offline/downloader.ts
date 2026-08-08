import type { OfflineSubjectPayload } from "@index/shared"
import { fetchApi } from "@/lib/api"
import {
  getSubjectBundle,
  removeSubjectBundle,
  saveSubjectBundle,
  type OfflineSubjectRecord,
} from "./db"
import { FILES_CACHE, API_CACHE } from "./cacheNames"

export interface OfflineDownloadProgress {
  filesDone: number
  filesTotal: number
  bytesDone: number
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

async function getCache(name: string): Promise<Cache | null> {
  if (typeof caches === "undefined") return null
  try {
    return await caches.open(name)
  } catch {
    return null
  }
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

/**
 * Deletes the cached files that belonged to the subject's previous download
 * but are no longer part of its current file set. Never touches other
 * subjects' files: the files cache is shared by all subjects (and by natural
 * browsing), so a sweep over the whole cache would wipe unrelated data.
 */
async function deleteStaleFiles(
  cache: Cache,
  previous: OfflineSubjectRecord,
  keep: string[],
): Promise<void> {
  const keepSet = new Set(keep.map(toAbsolute))
  await Promise.all(
    offlineFileUrls(previous.payload)
      .filter((url) => !keepSet.has(toAbsolute(url)))
      .map((url) => cache.delete(toAbsolute(url))),
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
  const previous = await getSubjectBundle(subjectId)
  const cache = await getFilesCache()

  await saveSubjectBundle(subjectId, payload, Date.now(), "incomplete")

  const filesTotal = urls.length
  let filesDone = 0
  let bytesDone = 0

  const report = () =>
    onProgress({
      filesDone,
      filesTotal,
      bytesDone,
    })

  await mapConcurrent(urls, CONCURRENCY, async (url) => {
    if (signal.aborted) throw abortError()
    const absolute = toAbsolute(url)
    const cached = await cache.match(absolute)
    if (cached) {
      const cl = await byteCount(cached)
      if (cl !== null) bytesDone += cl
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
    filesDone++
    report()
  })

  if (previous) await deleteStaleFiles(cache, previous, urls)
  await saveSubjectBundle(subjectId, payload, Date.now(), "complete")
}

/** Removes the subject's bundle, its cached files, and the cached bundle JSON
 *  (the latter lives in the SW's api runtime cache, which the downloader does
 *  not manage). */
export async function removeSubjectOffline(subjectId: string): Promise<void> {
  const record = await getSubjectBundle(subjectId)
  await removeSubjectBundle(subjectId)
  const deletions: Promise<boolean>[] = []
  if (record) {
    const filesCache = await getFilesCache().catch(() => null)
    if (filesCache) {
      for (const url of offlineFileUrls(record.payload)) {
        deletions.push(filesCache.delete(toAbsolute(url)))
      }
    }
  }
  const apiCache = await getCache(API_CACHE)
  if (apiCache) {
    deletions.push(apiCache.delete(toAbsolute(`/api/offline/subject/${subjectId}`)))
  }
  await Promise.all(deletions)
}

export function fetchOfflineSubject(subjectId: string): Promise<OfflineSubjectPayload> {
  return fetchApi(`/offline/subject/${subjectId}`)
}
