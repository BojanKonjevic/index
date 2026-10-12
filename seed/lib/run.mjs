import { spawnSync } from "node:child_process"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

// Shared repo-pinned wrangler invocation plus working directory. Never
// whatever happens to be on PATH: system wranglers differ in version and
// local-state behavior (4.126 corrupts fresh local D1 state, all tested
// versions mangle non-ASCII keys in local R2).
//
// Wrangler resolves local state (R2 buckets, D1) relative to the cwd, so
// every invocation must run from the worker dir. Running from anywhere else
// silently writes to a stray .wrangler folder and later reads miss.
export const ROOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "..")
export const WORKER_DIR = join(ROOT_DIR, "packages", "worker")
export const WRANGLER = join(ROOT_DIR, "node_modules", ".bin", "wrangler")

/** Runs cmd, returns stdout, throws with a stderr snippet on failure. */
export function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    cwd: WORKER_DIR,
    ...opts,
  })
  if (res.status !== 0) {
    throw new Error(`${cmd} ${args.join(" ")} failed: ${(res.stderr || "").slice(0, 300)}`)
  }
  return res.stdout
}
