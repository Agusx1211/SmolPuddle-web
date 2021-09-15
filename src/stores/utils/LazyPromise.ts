
export class LazyPromise<T, K extends string | number | symbol> {
  private pending: Record<K, Promise<T>> = {} as Record<K, Promise<T>>

  execute(key: K, promise: () => Promise<T>): Promise<T> {
    if (this.pending[key] !== undefined) {
      return this.pending[key]
    }

    const p = promise()
    this.pending[key] = p
    return p
  }
}

export function lazyPromise<T, K extends string | number | symbol, Z>(
  key: (args: Z) => K | undefined,
  promise: (args: Z) => Promise<T>
): (args: Z) => Promise<T> {
  const pending: Record<K, Promise<T>> = {} as Record<K, Promise<T>>
  return (args: Z) => {
    const k = key(args)
    if (k && pending[k] !== undefined) return pending[k]
    return promise(args)
  }
}

// export function lazyExecute<T, K extends string | number | symbol, Z>(
//   key: K,
//   promise: (...args: Z[]) => Promise<T>
// ): (...args: Z[]) => Promise<T> {
//   const pending: Record<K, Promise<T>> = {} as Record<K, Promise<T>>
//   return (...args: Z[]) => {

//   }
// }
