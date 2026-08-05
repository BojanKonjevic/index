export function normalizeSr(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
}

export function srGetFn(obj: unknown, path: string | string[]): string {
  const keys = Array.isArray(path) ? path : [path]
  let value: unknown = obj
  for (const key of keys) {
    value = (value as Record<string, unknown>)?.[key]
  }
  return normalizeSr(String(value ?? ""))
}
