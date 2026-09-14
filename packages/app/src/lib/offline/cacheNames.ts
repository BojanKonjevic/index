/**
 * Cache API names shared between the offline downloader and the service
 * worker's runtime caching (vite.config.ts). Rename here only.
 *
 * The Workbox handlers in vite.config.ts (`apiStrategyHandler` and
 * `fileStrategyHandler`) are stringified into sw.js as-is and cannot reference
 * module-scope identifiers, so they keep literals; vite.config.ts asserts at
 * build time that the literals match `API_CACHE` / `FILES_CACHE`.
 */
export const FILES_CACHE = "files"
export const API_CACHE = "api"
