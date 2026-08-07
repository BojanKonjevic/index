import type { OfflineSubjectPayload } from "@index/shared"

export type OfflineSubjectStatus = "complete" | "incomplete"

export interface OfflineSubjectRecord {
  subjectId: string
  revision: string
  materialCount: number
  downloadedAt: number
  status: OfflineSubjectStatus
  payload: OfflineSubjectPayload
}

export class OfflineDbError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause })
    this.name = "OfflineDbError"
  }
}

const DB_NAME = "indeks-offline"
const STORE = "offlineSubjects"
const DB_VERSION = 1

let dbPromise: Promise<IDBDatabase> | null = null

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () =>
      reject(new OfflineDbError("IndexedDB request failed", request.error ?? undefined))
  })
}

function openOfflineDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === "undefined") {
        reject(new OfflineDbError("IndexedDB is not available in this browser"))
        return
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION)
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "subjectId" })
        }
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () =>
        reject(new OfflineDbError("Could not open offline database", request.error ?? undefined))
      request.onblocked = () =>
        reject(new OfflineDbError("Offline database open was blocked by another tab"))
    })
  }
  return dbPromise
}

export function closeOfflineDb(): void {
  const pending = dbPromise
  dbPromise = null
  pending?.then((db) => db.close()).catch(() => {})
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openOfflineDb()
  const tx = db.transaction(STORE, mode)
  const result = requestToPromise(fn(tx.objectStore(STORE)))
  const done = new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () =>
      reject(new OfflineDbError("IndexedDB transaction failed", tx.error ?? undefined))
    tx.onabort = () =>
      reject(new OfflineDbError("IndexedDB transaction aborted", tx.error ?? undefined))
  })
  await Promise.all([result, done])
  return result
}

export async function saveSubjectBundle(
  subjectId: string,
  payload: OfflineSubjectPayload,
  downloadedAt = Date.now(),
  status: OfflineSubjectStatus = "complete",
): Promise<void> {
  const record: OfflineSubjectRecord = {
    subjectId,
    revision: payload.revision,
    materialCount: payload.materialCount,
    downloadedAt,
    status,
    payload,
  }
  await withStore("readwrite", (store) => store.put(record))
}

export async function getSubjectBundle(subjectId: string): Promise<OfflineSubjectRecord | null> {
  const record = await withStore("readonly", (store) => store.get(subjectId))
  return record ?? null
}

export async function getSubjectBundles(): Promise<OfflineSubjectRecord[]> {
  return withStore("readonly", (store) => store.getAll())
}

export async function removeSubjectBundle(subjectId: string): Promise<void> {
  await withStore("readwrite", (store) => store.delete(subjectId))
}

export async function isOfflineSubjectDownloaded(subjectId: string): Promise<boolean> {
  const record = await getSubjectBundle(subjectId)
  return record !== null
}
