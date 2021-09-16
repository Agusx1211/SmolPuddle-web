
import { ethers } from "ethers"
import { Store } from "."
import { ERC721Abi } from "../abi/ERC721"
import { SmolPuddleAbi } from "../abi/SmolPuddle"
import { isSupportedOrder, isValidSignature } from "../components/modal/CreateOrderModal"
import { SmolPuddleContract } from "../constants"
import { isOrderArray, Order, orderHash } from "../types/order"
import { safe } from "../utils"
import { CollectionsStore } from "./CollectionsStore"
import { Database, OrderStatus } from "./Database"
import { LocalStore } from "./LocalStore"
import { WakuStore } from "./WakuStore"
import { Web3Store } from "./Web3Store"


export const REBROADCAST_WINDOW = 24 * 60 * 60 * 1000
// export const TmpApi = "http://143.198.178.42:80"
export const TmpApi = "https://server.smolpuddle.io"

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

  constructor(private store: Store) {
    this.store.get(WakuStore).onEvent({
      isEvent: isOrderArray,
      callback: (async (orders: Order[]) => {
        return this.saveOrders(orders)
      })
    })

    fetch(`${TmpApi}/get`).then(async (response) => {
      const orders = await response.json() as Order[]
      console.log("saving", orders.length, "from api")
      return this.saveOrders(orders)
    })

    this.store.get(Database).getOrders({ status: 'open' }).then(({ orders }) => {
      this.refreshStatus(...orders)
      this.broadcast()
    })
  }
  
  saveOrders = async (orders: Order[]) => {
    const cleanOrders = this.cleanOrders(orders) as Order[]
    const { open } = await this.filterStatus(cleanOrders)

    this.store.get(Database).storeOrders(open)
  }

  addOrder = (order: Order, broadcast: boolean = false) => {
    if (broadcast) this.store.get(WakuStore).sendMsg([order], isOrderArray)

    this.store.get(CollectionsStore).saveCollection(order.sell.token)
    this.store.get(Database).storeOrders([order])
  }

  cleanOrders = (orders: Order[]) : Order[] => {
    return orders.map((order) => {
      if (order) { 
        // Add to list of known orders
        // TODO: let's do some sanity checks first (to avoid flooding)
        // ideas:
        //        check if seller has token, sanity check amounts, check isApproved
        //        put a limit of orders per-seller, check if seller has balance, etc
        if (!order.hash || safe(() => orderHash(order)) !== order.hash) {
          console.info('Drop order', order, 'invalid hash')
          return undefined
        }

        if (!isSupportedOrder(order)) {
          console.info('Drop unsuported order type', order)
          return undefined
        }

        if (!isValidSignature(order)) {
          // Check if sig version is wrong
          const sigV = order.signature.slice(130,132)
          if (sigV == '00' || sigV == '01') {
            // Since some older order may have broken signatures
            const newVersion = parseInt(sigV) + 27
            order.signature = order.signature.slice(0,130) + newVersion.toString(16) + order.signature.slice(132,134)

          } else {
            console.info('Drop invalid signature', order)
            return undefined
          }
        }
      }

      return order
    }).filter((o) => o !== undefined) as Order[]
  }

  broadcast = async () => {
    const now = new Date().getTime()
    const prev = this.wakuKeepAlive.get()

    if (now - prev < REBROADCAST_WINDOW) {
      console.info("Time for broadcast", (now - prev) / 1000, "seconds")
      return
    }

    this.store.get(Database).getOrders({ status: 'open' }).then(({ orders }) => {
      console.log("Broadcast orders", orders.length)

      fetch(`${TmpApi}/post`, {
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
        body: JSON.stringify(orders)
      }).catch((e) => {
        console.warn("error calling api", e)
      })

      this.store.get(WakuStore).sendMsg(orders, isOrderArray).catch((e) => {
        console.warn("error sending to waku", e)
      })
    }).catch((e) => {
      console.error("Error on broadcast", e)
    })

    this.wakuKeepAlive.set(now)
  }

  filterStatus = async (orders: Order[]): Promise<{ open: Order[], executed: Order[], canceled: Order[], badOwner: Order[] }> => {
    // TODO: We should check more things
    // like NFT ownership and approvalForAll status
    const provider = this.store.get(Web3Store).provider.get()
    const contract = new ethers.Contract(SmolPuddleContract, SmolPuddleAbi).connect(provider)
    const statuses = await Promise.all(orders.map((o) => safe(() => contract.status(o.seller, o.hash))))

    const open = orders.filter((_, i) => statuses[i] && statuses[i].eq(0))
    const executed = orders.filter((_, i) => statuses[i] && statuses[i].eq(1))
    const canceled = orders.filter((_, i) => statuses[i] && statuses[i].eq(2))

    // Only filter by correct owners on open orders
    const owners = await Promise.all(open.map(async (o) => {
      const contract = new ethers.Contract(o.sell.token, ERC721Abi).connect(provider)
      try {
        return await contract.ownerOf(o.sell.amountOrId)
      } catch (e) { console.warn(e)}
    }))

    const badOwner = open.filter((o, i) => owners[i] !== undefined && owners[i] !== o.seller)

    return { open, executed, canceled, badOwner }
  }

  refreshStatus = async (...orders: Order[]) => {
    const { executed, canceled, badOwner } = await this.filterStatus(orders)

    const db = this.store.get(Database)
    await db.setStatus(executed.map((e) => e.hash), OrderStatus.Closed)
    await db.setStatus(canceled.map((e) => e.hash), OrderStatus.Canceled)
    await db.setStatus(badOwner.map((e) => e.hash), OrderStatus.BadOwner)
  }
}
