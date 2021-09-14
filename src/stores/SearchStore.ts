import { observable } from "micro-observables"
import { Store } from "."

export class SearchStoreClass {
  public searching = observable('')
  public prevPage = observable('')

  constructor(private store: Store) {}

  setSearch = (search: string) => this.searching.set(search)
  setPrevPage = (page: string) => this.prevPage.set(page)
}

export const SearchStore = {
  constructor: SearchStoreClass,
  tag: 'searchstore'
}
