import { observable } from "micro-observables"
import { Store } from "."

export type SortFilter = 'high-low-price' | 'recent-listing' | 'low-high-price' | 'latest-sales'

export class SearchStore {
  public prevPage = observable('')
  public sortingFilter = observable<SortFilter>("low-high-price")

  constructor(private store: Store) {}

  setPrevPage = (page: string) => this.prevPage.set(page)

  setSortingFilter = (sort: SortFilter) => {
    this.sortingFilter.set(sort)
  }


}
