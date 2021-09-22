
import { Store } from "."
import { isOrderArray, Order } from "../types/order"
import { CollectionsStore } from "./CollectionsStore"
import { Database } from "./Database"
import { LocalStore } from "./LocalStore"
import { ServerStore } from "./ServerStore"
import { WakuStore } from "./WakuStore"

import { OrderStatus } from "../commons/db"
import { filterStatus } from "../commons/orders"
import { STATIC_PROVIDER } from "../constants"
import Waku, { WakuWorker } from "../workers/waku.worker"
import { Remote, wrap } from "comlink"

export const REBROADCAST_WINDOW = 3 * 60 * 60 * 1000

export class OrderbookStore {
  // TODO: Keep old stores just in case we need to re-enable them
  // but if we don't we can't just wipe this data later

  // If we want to persist all the known orders maybe we should use IndexedDB
  // this is going to fill up quicklyfee
  // public knownOrders = new LocalStore<StoredOrder[], StoredOrder[]>("@smolpuddle.known.orders.v2", [])
  // public canceledOrders = new LocalStore<string[], string[]>("@smolpuddle.canceled.orders", [])
  // public executedOrders = new LocalStore<string[], string[]>("@smolpuddle.executed.orders", [])

  // This may not be neccesary if we just stop tracking deleted orders
  // but keeping track of them may be neccesary so we don't relay anything that's not valid
  // public orders = this.knownOrders.observable.select((orders) => {
  //   const cleanedOrders = this.cleanOrders(orders) as StoredOrder[]
  //   return this.canceledOrders.observable.select((canceled) => {
  //     return this.executedOrders.observable.select((executed) => {
  //       return cleanedOrders.filter((o) => !canceled.includes(o.order.hash) && !executed.includes(o.order.hash))
  //     })
  //   })
  // })

  private wakuKeepAlive = new LocalStore<number, number>("@smolpuddle.waku.keep.alive", 0)
  private workerWaku: Remote<WakuWorker>

  constructor(private store: Store) {
    const workerInstance = new Waku()
    this.workerWaku = wrap<WakuWorker>(workerInstance)

    this.store.get(WakuStore).onEvent({
      isEvent: isOrderArray,
      callback: (async (orders: Order[]) => {
        if (orders.length > 0) {
          this.workerWaku.processWakuOrders(orders).then(() => {
            this.store.get(Database).notifyUpdate()
          })
        }
      })
    })

    // Sync with servers every 3 minutes
    this.store.get(ServerStore).syncOrders()

    setInterval(() => { 
      this.store.get(ServerStore).syncOrders()
    }, 3 * 60 * 1000)

    this.store.get(Database).getOrders({ status: 'open' }).then(({ orders }) => {
      this.refreshStatus(...orders)
      this.broadcast()
    })
  }

  addOrder = (order: Order, broadcast: boolean = false) => {
    if (broadcast) {
      this.store.get(WakuStore).sendMsg([order], isOrderArray)
      this.store.get(ServerStore).postOrders([order])
    }

    this.store.get(CollectionsStore).saveCollection(order.sell.token)
    this.store.get(Database).storeOrders([order])
  }

  broadcast = async () => {
    const now = new Date().getTime()
    const prev = this.wakuKeepAlive.get()

    if (now - prev < REBROADCAST_WINDOW) {
      console.info("Time for broadcast", (REBROADCAST_WINDOW - (now - prev)) / 1000, "seconds")
      return
    }

    this.store.get(Database).getOrders({ status: 'open' }).then(({ orders }) => {
      if (orders.length > 0) {
        console.log("Broadcast orders", orders.length)

        this.store.get(ServerStore).postOrders(orders)

        this.store.get(WakuStore).sendMsg(orders, isOrderArray).catch((e) => {
          console.warn("error sending to waku", e)
        })
      }
    }).catch((e) => {
      console.error("Error on broadcast", e)
    })

    this.wakuKeepAlive.set(now)
  }

  refreshStatus = async (...orders: Order[]) => {
    const { executed, canceled, badOwner } = await filterStatus(STATIC_PROVIDER, orders)

    const db = this.store.get(Database)
    await db.setStatus(executed.map((e) => e.hash), OrderStatus.Closed)
    await db.setStatus(canceled.map((e) => e.hash), OrderStatus.Canceled)
    await db.setStatus(badOwner.map((e) => e.hash), OrderStatus.BadOwner)
  }
}
