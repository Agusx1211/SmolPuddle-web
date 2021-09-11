
import { Store } from "."
import { LocalStore } from "./LocalStore"
import { WakuStore } from "./WakuStore"

export class OrderbookStore {
  // If we want to persist all the known orders maybe we should use IndexedDB
  // this is going to fill up quicklyfee
  public knownOrders = new LocalStore<Order[], Order[]>("@smolsea.known.orders", [])
  public canceledOrders = new LocalStore<string[], string[]>("@smolsea.canceled.orders", [])
  public executedOrders = new LocalStore<string[], string[]>("@smolsea.executed.orders", [])

  // This may not be neccesary if we just stop tracking deleted orders
  // but keeping track of them may be neccesary so we don't relay anything that's not valid
  public orders = this.knownOrders.observable.select((orders) => {
    return this.canceledOrders.observable.select((canceled) => {
      return this.executedOrders.observable.select((executed) => {
        return orders.filter((o) => !canceled.includes(o.hash) && !executed.includes(o.hash))
      })
    })
  })

  constructor(private store: Store) {
    this.store.get(WakuStore).onEvent({
      isEvent: isOrder,
      callback: (async (order: Order) => {
        // Add to list of known orders
        // TODO: let's do some sanity checks first (to avoid flooding)
        // ideas:
        //        check if seller has token, sanity check amounts, check isApproved
        //        put a limit of orders per-seller, check if seller has balance, etc
        this.knownOrders.set([...this.knownOrders.get(), order])
      })
    })
  }

  
}
