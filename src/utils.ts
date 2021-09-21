import { ethers } from "ethers"
import { Observable } from "micro-observables"
import { SmolPuddleAbi } from "./abi/SmolPuddle"
import { SmolPuddleContract } from "./constants"

export function safe<T>(f: () => T): T | undefined {
  try {
    return f()
  } catch {
    return undefined
  }
}

export function set<T extends string | number>(arr: Array<T>): Array<T> {
  return arr.filter((v, i) => arr.indexOf(v) === i)
}

export function fallback<T>(val: T | null | undefined, def: T): T {
  return val !== null && val !== undefined ? val : def
}

export function capitalize(string: string) {
  if (string.length === 0) return string
  return string.slice(0, 1).toUpperCase() + string.slice(1)
}

const contract = new ethers.Contract(SmolPuddleContract, SmolPuddleAbi)

export function parseError(e: any): string {
  if (e.data && e.data.message && typeof e.data.message === 'string') {
    try {
      if (e.data.data) {
        return `${capitalize(e.data.message)} - ${contract.interface.getError(e.data.data).name}`
      }
    } catch {}
    return capitalize(e.data.message)
  }

  if (e.message && typeof e.message === 'string') {
    return capitalize(e.message)
  }

  return capitalize(e.toString())
}

export function fuzzyEq(a?: string, b?: string) {
  if (!a || !b) return false
  const al = a.toLowerCase()
  const bl = b.toLowerCase()
  return al.includes(bl) || bl.includes(al)
}

export async function waitObservable<T>(o: Observable<T | undefined>): Promise<T> {
  const val = o.get()
  if (val !== undefined) return val

  return new Promise((resolve) => {
    var unsubscribe: undefined | (() => void)
    unsubscribe = o.subscribe((v) => {
      if (v !== undefined) {
        resolve(v)
        if (unsubscribe) unsubscribe()
      }
    })
  })
}

export function chunks<T>(input: Array<T>, maxSize: number): Array<Array<T>> {
  const result: Array<Array<T>> = []

  for (let i = 0, j = input.length; i < j; i += maxSize) {
    result.push(input.slice(i, i + maxSize))
  }

  return result
}

export async function serially<T, K>(
  values: Array<T>,
  promise: (val: T) => Promise<K>,
  onError?: (e: any, val: T) => boolean | void
): Promise<Array<K | undefined>> {
  const results: Array<K | undefined> = []

  for (const v of values) {
    try {
      results.push(await promise(v))
    } catch (e: any) {
      if (onError) {
        if (onError(e, v)) {
          throw e
        }
      }

      results.push(undefined)
    }
  }

  return results
}
