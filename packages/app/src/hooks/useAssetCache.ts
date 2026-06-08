import { useState } from "react"
import { fetchMaterialAssets } from "@/lib/api"
import type { MaterialAsset } from "@index/shared"

export function useAssetCache() {
  const [cache, setCache] = useState<Record<string, MaterialAsset[]>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})

  const load = async (materialId: string) => {
    if (cache[materialId] || loading[materialId]) return
    setLoading((prev) => ({ ...prev, [materialId]: true }))
    try {
      const assets = await fetchMaterialAssets(materialId)
      setCache((prev) => ({ ...prev, [materialId]: assets }))
    } finally {
      setLoading((prev) => ({ ...prev, [materialId]: false }))
    }
  }

  return { cache, loading, load }
}
