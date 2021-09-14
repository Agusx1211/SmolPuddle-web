import { observable } from "micro-observables"
import { Store } from "."

export class SearchStoreClass {
  public prevPage = observable('')

  constructor(private store: Store) {}

  setPrevPage = (page: string) => this.prevPage.set(page)
}

export const SearchStore = {
  constructor: SearchStoreClass,
  tag: 'searchstore'
}
