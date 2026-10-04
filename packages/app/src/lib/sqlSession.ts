import type { Database } from "sql.js"
import { useEffect, useRef } from "react"

type SqlJsStatic = Awaited<ReturnType<typeof import("sql.js").default>>

let sqlPromise: Promise<SqlJsStatic> | null = null

export function loadSql() {
  if (!sqlPromise) {
    sqlPromise = (async () => {
      const [{ default: initSqlJs }, { default: wasmUrl }] = await Promise.all([
        import("sql.js"),
        import("sql.js/dist/sql-wasm.wasm?url"),
      ])
      return initSqlJs({ locateFile: () => wasmUrl })
    })()
  }
  return sqlPromise
}

export function dropUnsupportedStatements(setup: string): string {
  // SQLite has no ALTER TABLE ... ADD CONSTRAINT, which the seeded
  // insert scripts use. Constraints never change query results, so only
  // those statements are dropped; everything else still errors loudly.
  return setup
    .split(";")
    .filter((stmt) => !/^\s*alter\s+table\s+\S+\s+add\s+constraint\b/i.test(stmt))
    .join(";")
}

/** One live database per open file. Runs accumulate like a REPL:
 *  creating a table in one block makes it visible to the next.
 *  Closing the file drops the database. */
export function useSqlSession(dataUrls: string[]) {
  const dbRef = useRef<Database | null>(null)
  const dataCache = useRef(new Map<string, string>())
  const urlsRef = useRef(dataUrls)
  useEffect(() => {
    urlsRef.current = dataUrls
  }, [dataUrls])

  useEffect(
    () => () => {
      dbRef.current?.close()
      dbRef.current = null
    },
    [],
  )

  const getDb = async (): Promise<Database> => {
    if (!dbRef.current) {
      const SQL = await loadSql()
      const db = new SQL.Database()
      let setup = ""
      for (const url of urlsRef.current) {
        let text = dataCache.current.get(url)
        if (text === undefined) {
          const res = await fetch(url)
          if (!res.ok) throw new Error(`DATA_LOAD_FAILED:${res.status}`)
          text = await res.text()
          dataCache.current.set(url, text)
        }
        setup += `\n${text}`
      }
      // One exec first: SQLite parses literals correctly that way.
      // Only when the whole setup fails, retry statement by statement and
      // keep whatever applies. The block itself still errors loudly.
      const filtered = dropUnsupportedStatements(setup)
      if (filtered.trim()) {
        try {
          db.exec(filtered)
        } catch {
          const statements = filtered
            .split(";")
            .map((s) => s.trim())
            .filter(Boolean)
          let applied = 0
          let lastError: unknown = null
          for (const stmt of statements) {
            try {
              db.exec(stmt)
              applied += 1
            } catch (e) {
              lastError = e
            }
          }
          if (applied === 0) {
            db.close()
            throw lastError instanceof Error ? lastError : new Error(String(lastError))
          }
        }
      }
      dbRef.current = db
    }
    return dbRef.current
  }

  const resetDb = () => {
    dbRef.current?.close()
    dbRef.current = null
  }

  return { getDb, resetDb }
}
