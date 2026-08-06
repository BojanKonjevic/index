import { normalizeSr } from "./normalize"

const MAX_TOKENS = 8
const MAX_TOKEN_LENGTH = 64
const MIN_TOKEN_LENGTH = 2
const TOKEN_RE = /^[a-z0-9]+$/

/**
 * Build a safe FTS5 MATCH expression from a raw user query.
 *
 * Whitelist-only: every token must survive `normalizeSr` into the Latin alphabet
 * and is then quoted, so FTS5 operator syntax (quotes, *, -, NEAR, etc.) can
 * never leak through to the MATCH statement from user input.
 *
 * Returns `null` when nothing meaningful survives (empty/whitespace/one-char/
 * symbols-only input), in which case the caller should skip the database call
 * entirely rather than run an empty or malformed query.
 */
export function buildFtsQuery(rawQuery: string): string | null {
  const normalized = normalizeSr(rawQuery)
  const tokens = normalized
    .split(/\s+/)
    .filter((token) => TOKEN_RE.test(token))
    .filter((token) => token.length >= MIN_TOKEN_LENGTH)
    .slice(0, MAX_TOKENS)
    .map((token) => token.slice(0, MAX_TOKEN_LENGTH))

  if (tokens.length === 0) return null

  return tokens.map((token) => `"${token}"*`).join(" AND ")
}
