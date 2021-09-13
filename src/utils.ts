
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

export function capitalize(string: string) {
  if (string.length === 0) return string
  return string.slice(0, 1).toUpperCase() + string.slice(1)
}

export function parseError(e: any): string {
  if (e.data && e.data.message && typeof e.data.message === 'string') {
    return capitalize(e.data.message)
  }

  if (e.message && typeof e.message === 'string') {
    return capitalize(e.message)
  }

  return capitalize(e.toString())
}
