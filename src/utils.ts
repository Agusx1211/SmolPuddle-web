
export function safe<T>(f: () => T): T | undefined {
  try {
    return f()
  } catch {
    return undefined
  }
}
