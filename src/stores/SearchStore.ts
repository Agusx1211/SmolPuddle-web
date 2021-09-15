import { ethers } from "ethers"
import { observable } from "micro-observables"
import { Store } from "."
import { Collectible, StoredOrder } from "./OrderbookStore"

export class SearchStore {
  public prevPage = observable('')
  public sortingFilter = observable<string>("low-high-price")

  constructor(private store: Store) {}

  setPrevPage = (page: string) => this.prevPage.set(page)
  setSortingFilter = (sort: string) => {
    this.sortingFilter.set(sort)
  }
  sortOrders =  (orders: StoredOrder[]) => {
    const sort = this.sortingFilter.get()
    if (sort.includes("price")) {
      return this.sortOrdersPrice(orders)
    } else if (sort === "recent-listing") {
      return this.sortOrdersListing(orders)
    } else {
      return orders
    }
  }

  sortCollectibles =  (collectibles: Collectible[]) => {
    const sort = this.sortingFilter.get()
    if (sort.includes("price")) {
      return this.sortCollectiblesPrice(collectibles)
    } else if (sort === "recent-listing") {
      return this.sortCollectiblesListing(collectibles)
    } else {
      return collectibles
    }
  }

  sortOrdersPrice = (orders: StoredOrder[]) => {
    return orders.sort((a, b) => {
      const asp = ethers.BigNumber.from(a.order.ask.amountOrId)
      const bsp = ethers.BigNumber.from(b.order.ask.amountOrId)
      return this.sortingFct(asp, bsp)
    })
  }

  sortCollectiblesPrice =  (collectibles: Collectible[]) => {
    return collectibles.sort((a, b) => {
      const asp = a.listing ? ethers.BigNumber.from(a.listing.order.ask.amountOrId) : undefined
      const bsp = b.listing ? ethers.BigNumber.from(b.listing.order.ask.amountOrId) : undefined
      return this.sortingFct(asp, bsp)
    })
  }

  sortOrdersListing = (orders: StoredOrder[]) => {
    return orders.sort((a, b) => {
      const asp = ethers.BigNumber.from(a.order.expiration)
      const bsp = ethers.BigNumber.from(b.order.expiration)
      return this.sortingFct(asp, bsp)
    })
  }

  sortCollectiblesListing =  (collectibles: Collectible[]) => {
    return collectibles.sort((a, b) => {
      const asp = a.listing ? ethers.BigNumber.from(a.listing.order.expiration) : undefined
      const bsp = b.listing ? ethers.BigNumber.from(b.listing.order.expiration) : undefined
      return this.sortingFct(asp, bsp)
    })
  }

  // Sort based on currently selected sort filter
  sortingFct = (a?: ethers.BigNumber, b?: ethers.BigNumber) => {
    if (a && b) {
      switch (this.sortingFilter.get()) {
        case "low-high-price": {
          return a.eq(b) ? 0 : a.lt(b) ? -1 : 1
        }
        case "high-low-price": {
          return a.eq(b) ? 0 : a.gt(b) ? -1 : 1
        }
        case "recent-listing": {
          return a.eq(b) ? 0 : a.gt(b) ? -1 : 1
        }
        case "latest-sales": {
          // TODO
          return 0
        }
        default: {
          return 0
        }
      }

    // Put colletibles with listing first
    } else if (a) {
      return -1;

    } else {
      return 1
    }
  }
}
