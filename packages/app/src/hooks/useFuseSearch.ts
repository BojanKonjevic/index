import Fuse, { type IFuseOptions } from "fuse.js"
import { normalizeSr } from "@/lib/normalize"

export function useFuseSearch<T>(
  items: T[],
  options: IFuseOptions<T>,
  query: string,
  limit?: number,
): T[] {
  const opts = { ...options }

  const fuse = new Fuse(items, {
    ...opts,
    getFn: (obj: unknown, path: string | string[]) => {
      const keys = Array.isArray(path) ? path : [path]
      let value: unknown = obj
      for (const key of keys) {
        value = (value as Record<string, unknown>)?.[key]
      }
      return normalizeSr(String(value ?? ""))
    },
  })

  const normalizedQuery = normalizeSr(query)

  if (!query.trim()) return items
  const results = fuse.search(normalizedQuery)
  const mapped = results.map((r) => r.item)
  return limit ? mapped.slice(0, limit) : mapped
}
