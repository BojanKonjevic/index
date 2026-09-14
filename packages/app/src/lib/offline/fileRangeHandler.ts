// Byte-range file handler serialized verbatim into sw.js (see vite.config.ts).
//
// This module must import nothing: any import chain (even a Node builtin)
// would leak foreign globals into whichever program typechecks it. It uses
// only web globals available in both the service worker (DOM lib) and the
// Node typecheck of vite.config.ts (undici types).

declare const caches: {
  open(name: string): Promise<{
    match(request: Request): Promise<Response | undefined>
    put(request: Request, response: Response): Promise<void>
  }>
}

// Files (PDFs/images/videos): cache-first with manual byte-range slicing.
//
// Why not Workbox's RangeRequestsPlugin: workbox-build inlines the plugin's
// `cachedResponseWillBeUsed` into sw.js but drops the module-scope
// `createPartialResponse` binding it calls, so every ranged read throws
// `ReferenceError` in production. Small files load in one whole request and
// never send Range, which is why only some PDFs failed. This handler uses
// only service worker globals, so nothing can go missing in the inlined copy.
//
// Entries are always written as complete files and ranged reads slice from
// the full bytes. A cached entry whose status is not 200 is a partial write
// left by the old plugin path; it is refetched, so poisoned entries heal
// themselves on the next online load.
export async function fileStrategyHandler({ request }: { request: Request }): Promise<Response> {
  const fullRequest = new Request(request.url)
  const cache = await caches.open("files")

  let full = await cache.match(fullRequest)
  if (!full || full.status !== 200) {
    const network = await fetch(fullRequest)
    if (network.ok) {
      await cache.put(fullRequest, network.clone())
      full = network
    } else if (!full) {
      throw new Error(`file fetch failed with status ${network.status}`)
    }
  }

  const rangeHeader = request.headers.get("range")
  if (!rangeHeader || !full || full.status !== 200) {
    if (!full) throw new Error("file unavailable")
    return full
  }

  const data = await full.arrayBuffer()
  const total = data.byteLength
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim())
  let start: number
  let end: number
  if (!match || (match[1] === "" && match[2] === "")) {
    return new Response(null, {
      status: 416,
      headers: { "Content-Range": `bytes */${total}` },
    })
  }
  if (match[1] === "") {
    const suffix = parseInt(match[2], 10)
    start = Math.max(0, total - suffix)
    end = total - 1
  } else {
    start = parseInt(match[1], 10)
    end = match[2] === "" ? total - 1 : parseInt(match[2], 10)
  }
  if (Number.isNaN(start) || Number.isNaN(end) || start >= total || end < start) {
    return new Response(null, {
      status: 416,
      headers: { "Content-Range": `bytes */${total}` },
    })
  }
  end = Math.min(end, total - 1)

  return new Response(data.slice(start, end + 1), {
    status: 206,
    headers: {
      "Content-Type": full.headers.get("content-type") ?? "application/octet-stream",
      "Content-Range": `bytes ${start}-${end}/${total}`,
      "Content-Length": String(end - start + 1),
      "Accept-Ranges": "bytes",
    },
  })
}
