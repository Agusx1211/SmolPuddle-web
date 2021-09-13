
import { ethers } from "ethers"
import { Store } from "."
import { SmolPuddleAbi } from "../abi/SmolPuddle"
import { isSupportedOrder } from "../components/modal/CreateOrderModal"
import { SmolPuddleContract } from "../constants"
import { parseAddress } from "../types/address"
import { isOrderArray, Order, orderHash } from "../types/order"
import { safe } from "../utils"
import { LocalStore } from "./LocalStore"
import { WakuStore } from "./WakuStore"
import { Web3Store } from "./Web3Store"

export type StoredOrder = {
  order: Order,
  lastSeen: number
}

export const REBROADCAST_WINDOW = 30

export class OrderbookStoreClass {
  // If we want to persist all the known orders maybe we should use IndexedDB
  // this is going to fill up quicklyfee
  public knownOrders = new LocalStore<StoredOrder[], StoredOrder[]>("@smolpuddle.known.orders", [])
  public canceledOrders = new LocalStore<string[], string[]>("@smolpuddle.canceled.orders", [])
  public executedOrders = new LocalStore<string[], string[]>("@smolpuddle.executed.orders", [])

  // This may not be neccesary if we just stop tracking deleted orders
  // but keeping track of them may be neccesary so we don't relay anything that's not valid
  public orders = this.knownOrders.observable.select((orders) => {
    return this.canceledOrders.observable.select((canceled) => {
      return this.executedOrders.observable.select((executed) => {
        return orders.filter((o) => !canceled.includes(o.order.hash) && !executed.includes(o.order.hash))
      })
    })
  })

  constructor(private store: Store) {
    this.store.get(WakuStore).onEvent({
      isEvent: isOrderArray,
      callback: (async (orders: Order[]) => {
        orders.forEach((order) => {
          // Add to list of known orders
          // TODO: let's do some sanity checks first (to avoid flooding)
          // ideas:
          //        check if seller has token, sanity check amounts, check isApproved
          //        put a limit of orders per-seller, check if seller has balance, etc
          if (orderHash(order) !== order.hash) {
            console.info('Drop order', order, 'invalid hash')
            return
          }

          if (!isSupportedOrder(order)) {
            console.info('Drop unsupoted order type', order)
            return
          }

          this.addOrder(order)
        })
      })
    })

    this.broadcast()
  }

  listingFor = (contractAddr: string, iid: ethers.BigNumberish) => this.orders.select((orders) => {
    const addr = parseAddress(contractAddr)
    if (!addr) return undefined

    const id = safe(() => ethers.BigNumber.from(iid))
    if (!id) return undefined

    return orders.find((o) => ethers.utils.getAddress(o.order.sell.token) === addr && id.eq(o.order.sell.amountOrId))
  })

  addOrder = (order: Order, broadcast: boolean = false) => {
    if (broadcast) this.store.get(WakuStore).sendMsg([order])

    this.knownOrders.update((known) => {
      const now = new Date().getTime()
      const index = known.findIndex((o) => o.order.hash === order.hash)
      if (index !== -1) {
        known[index].lastSeen = now
        return Object.assign([], known)
      } else {
        return [...known, { order, lastSeen: now }]
      }
    })
  }

  broadcast = async () => {
    const now = new Date().getTime()
    const orders = this.orders.get()
    const notSeenInWindow = orders.filter((o) => now - o.lastSeen > REBROADCAST_WINDOW)
    this.store.get(WakuStore).sendMsg(notSeenInWindow)
  }

  refreshStatus = async (...orders: Order[]) => {
    // TODO: We should check more things
    // like NFT ownership and approvalForAll status
    const provider = this.store.get(Web3Store).provider.get()
    const contract = new ethers.Contract(SmolPuddleContract, SmolPuddleAbi).connect(provider)
    const statuses = await Promise.all(orders.map((o) => contract.status(o.seller, o.hash)))

    const executed = orders.filter((_, i) => statuses[i].eq(1))
    const canceled = orders.filter((_, i) => statuses[i].eq(2))

    this.executedOrders.update((prev) => {
      return [...prev, ...executed.map((o) => o.hash)]
    })

    this.canceledOrders.update((prev) => {
      return [...prev, ...canceled.map((o) => o.hash)]
    })

    this.broadcast()
  }
}

export const OrderbookStore = {
  constructor: OrderbookStoreClass,
  tag: 'orderbookstore'
}
