
export function safe<T>(f: () => T): T | undefined {
  try {
    return f()
  } catch {
    return undefined
  }
}

export function set<T>(arr: Array<T>): Array<T> {
  return arr.filter((v, i) => arr.indexOf(v) === i)
}

export function fallback<T>(val: T | null | undefined, def: T): T {
  return val !== null && val !== undefined ? val : def
}
