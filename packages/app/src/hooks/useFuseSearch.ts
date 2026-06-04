import Fuse, { type IFuseOptions } from "fuse.js"
import { useMemo } from "react"

export function useFuseSearch<T>(
  items: T[],
  options: IFuseOptions<T>,
  query: string,
  limit?: number,
): T[] {
  const fuse = useMemo(() => new Fuse(items, options), [items, options])

  return useMemo(() => {
    if (!query.trim()) return items
    const results = fuse.search(query)
    const mapped = results.map((r) => r.item)
    return limit ? mapped.slice(0, limit) : mapped
  }, [fuse, query, limit])
}
