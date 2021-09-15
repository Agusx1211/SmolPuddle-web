
import { ethers } from "ethers"
import { Store } from "."
import { ERC721Abi } from "../abi/ERC721"
import { SmolPuddleAbi } from "../abi/SmolPuddle"
import { isSupportedOrder, isValidSignature } from "../components/modal/CreateOrderModal"
import { SmolPuddleContract } from "../constants"
import { parseAddress } from "../types/address"
import { isOrderArray, Order, orderHash } from "../types/order"
import { safe, set } from "../utils"
import { CollectionsStore } from "./CollectionsStore"
import { LocalStore } from "./LocalStore"
import { WakuStore } from "./WakuStore"
import { Web3Store } from "./Web3Store"

export type Collectible = {
  tokenId: number,
  listing?: StoredOrder
}

export type StoredOrder = {
  order: Order,
  lastSeen: number,
}

export const REBROADCAST_WINDOW = 24 * 60 * 60 * 1000
// export const TmpApi = "http://143.198.178.42:80"
export const TmpApi = "https://server.smolpuddle.io"

export class OrderbookStore {
  // If we want to persist all the known orders maybe we should use IndexedDB
  // this is going to fill up quicklyfee
  public knownOrders = new LocalStore<StoredOrder[], StoredOrder[]>("@smolpuddle.known.orders.v2", [])
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
        return this.saveOrders(orders)
      })
    })

    fetch(`${TmpApi}/get`).then(async (response) => {
      const orders = await response.json() as Order[]
      return this.saveOrders(orders)
    })

    this.broadcast()
    this.refreshStatus(...this.orders.get().map((o) => o.order))
  }
  
  saveOrders = async (orders: Order[]) => {
    const cleanOrders = this.cleanOrders(orders)
    const { open } = await this.filterStatus(cleanOrders)

    // open.forEach((order) => this.addOrder(order))
    // Update orders in a single mutation
    this.knownOrders.set(open.map(o => {
      this.store.get(CollectionsStore).saveCollection(o.sell.token)
      const now = new Date().getTime()
      return {order: o, lastSeen: now}
    }))

    // save known item ids
    const collections = set(orders.map((o) => o.sell.token))
    collections.forEach((collection) => {
      const ids = orders.filter((o) => o.sell.token === collection).map((o) => o.sell.amountOrId)
      this.store.get(CollectionsStore).saveCollectionItems(collection, ids)
    })
  }

  listingFor = (contractAddr: string, iid: ethers.BigNumberish) => this.orders.select((orders) => {
    const addr = parseAddress(contractAddr)
    if (!addr) return undefined

    const id = safe(() => ethers.BigNumber.from(iid))
    if (!id) return undefined

    return orders.find((o) => ethers.utils.getAddress(o.order.sell.token) === addr && id.eq(o.order.sell.amountOrId))
  })

  addOrder = (order: Order, broadcast: boolean = false) => {
    if (broadcast) this.store.get(WakuStore).sendMsg([order], isOrderArray)

    this.store.get(CollectionsStore).saveCollection(order.sell.token)
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

  cleanOrders = (orders: Order[]) : Order[] => {
    return orders.map((order) => {
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
        console.info('Drop unsupoted order type', order)
        return undefined
      }

      if (!isValidSignature(order)) {
        console.info('Drop invalid signature', order)
        return undefined
      }

      return order
    }).filter((o) => o !== undefined) as Order[]
  }

  broadcast = async () => {
    const now = new Date().getTime()
    const orders = this.orders.get()

    const notSeenInWindow = orders.filter((o) => now - o.lastSeen > REBROADCAST_WINDOW)

    fetch(`${TmpApi}/post`, {
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
      body: JSON.stringify(orders.map((o) => o.order))
    }).catch((e) => {
      console.warn("error calling api", e)
    })

    if (notSeenInWindow.length > 0) {
      this.store.get(WakuStore).sendMsg(notSeenInWindow.map((o) => o.order), isOrderArray)
      this.knownOrders.update((known) => {
        known.forEach((o, i) => {
          const found = notSeenInWindow.find((nt) => nt.order.hash === o.order.hash)
          if (found) known[i].lastSeen = now
        })
        return [...known]
      })
    }
  }

  filterStatus = async (orders: Order[]): Promise<{ open: Order[], executed: Order[], canceled: Order[] }> => {
    // TODO: We should check more things
    // like NFT ownership and approvalForAll status
    const provider = this.store.get(Web3Store).provider.get()
    const contract = new ethers.Contract(SmolPuddleContract, SmolPuddleAbi).connect(provider)
    const statuses = await Promise.all(orders.map((o) => contract.status(o.seller, o.hash)))

    const open = orders.filter((_, i) => statuses[i].eq(0))
    const executed = orders.filter((_, i) => statuses[i].eq(1))
    const canceled = orders.filter((_, i) => statuses[i].eq(2))

    // Only filter by correct owners on open orders
    const owners = await Promise.all(open.map(async (o) => {
      const contract = new ethers.Contract(o.sell.token, ERC721Abi).connect(provider)
      try {
        return await contract.ownerOf(o.sell.amountOrId)
      } catch (e) { console.warn(e)}
    }))

    const badOwner = open.filter((o, i) => owners[i] !== undefined && owners[i] !== o.seller)

    return { open, executed, canceled: [...canceled, ...badOwner] }
  }

  refreshStatus = async (...orders: Order[]) => {
    const { executed, canceled } = await this.filterStatus(orders)

    this.executedOrders.update((prev) => {
      return set([...prev, ...executed.map((o) => o.hash)])
    })

    this.canceledOrders.update((prev) => {
      return set([...prev, ...canceled.map((o) => o.hash)])
    })

    this.broadcast()
  }
}
