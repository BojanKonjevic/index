import { useMemo } from "react"
import Fuse, { type IFuseOptions } from "fuse.js"
import { normalizeSr, srGetFn } from "@/lib/normalize"

export function useFuseSearch<T>(
  items: T[],
  options: IFuseOptions<T>,
  query: string,
  limit?: number,
): T[] {
  const fuse = useMemo(
    () =>
      new Fuse(items, {
        ...options,
        getFn: srGetFn,
      }),
    [items, options],
  )

  if (!query.trim()) return items
  const results = fuse.search(normalizeSr(query))
  const mapped = results.map((r) => r.item)
  return limit ? mapped.slice(0, limit) : mapped
}
