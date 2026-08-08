/**
 * Cache API names shared between the offline downloader and the service
 * worker's runtime caching (vite.config.ts). Rename here only.
 *
 * The Workbox `apiStrategyHandler` is stringified into sw.js as-is and cannot
 * reference module-scope identifiers, so it keeps a literal — vite.config.ts
 * asserts at build time that it matches `API_CACHE`.
 */
export const FILES_CACHE = "files"
export const API_CACHE = "api"
