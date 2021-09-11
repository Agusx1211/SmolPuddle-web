import React, { useContext } from 'react'

type StoreConstructor<T> = new (store: Store) => T

/*
  Allow for dynamically importing stores

  Usage:

    type WalletStore = ImportStore<typeof import('./WalletStore'), 'WalletStore'>
    ..
    const walletStore = await this.store.getAsync<WalletStore>(import('./WalletStore'), 'WalletStore')
*/

export type ImportStore<T, K extends keyof T> = T extends Record<K, infer S>
  ? S extends new (...args: any[]) => infer R
    ? R
    : never
  : never

export class Store {
  stores: { [key: string]: any } = {}

  get<T>(klass: StoreConstructor<T>) {
    const cachedStore = this.stores[klass.name] as T | undefined

    if (cachedStore) {
      return cachedStore
    }

    // Initialize store
    const store = new klass(this)

    // Add store to cache
    this.stores[klass.name] = store

    return store
  }

  async getAsync<T>(importPromise: Promise<any>, namedExport: string) {
    const klass = (await importPromise)[namedExport] as StoreConstructor<T>
    return this.get(klass)
  }
}

export const createStore = () => new Store()

export const StoreContext = React.createContext<Store | null>(null)

export const StoreProvider = ({ store, children }: { store: Store; children: React.ReactNode }) => {
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}

export function useStore<T>(klass: StoreConstructor<T>) {
  const store = useContext(StoreContext)

  if (!store) {
    throw new Error('store cannot be null! check your <StoreProvider ...>')
  }

  return store.get(klass)
}

export { Observable, observable, useObservable, useMemoizedObservable, useComputedObservable } from 'micro-observables'
