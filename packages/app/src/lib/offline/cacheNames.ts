/**
 * Cache API names shared between the offline downloader and the service
 * worker's runtime caching (vite.config.ts). Rename here only.
 *
 * The Workbox handlers in vite.config.ts (`apiStrategyHandler` and
 *  `fileStrategyHandler`) are stringified into sw.js as-is and cannot reference
 *  module-scope identifiers, so they keep literals; vite.config.ts asserts at
 *  build time that the literals match `API_CACHE` / `FILES_CACHE`.
 *
 *  Bump FILES_CACHE whenever a shipped file is rewritten in place (R2 key
 *  unchanged, bytes changed): both caches are pure cache-first with no
 *  revalidation, so without a rename clients keep serving the old bytes
 *  forever. The boot cleanup in main.tsx deletes every superseded files*
 *  cache, keyed off this constant, so a bump is a one-line change here plus
 *  the matching literal in fileRangeHandler.ts.
 */
export const FILES_CACHE = "files-v6"
export const API_CACHE = "api"
