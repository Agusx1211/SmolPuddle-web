import { ethers } from "ethers"
import { IDBPDatabase } from "idb"
import { observable } from "micro-observables"
import { Store } from "."
import { CompoundIndexAmount, CompoundIndexExpiration, CompoundIndexSellToken, DbOrder, fromDbOrders, openSmolDb, OrderStatus, SmolDB, storeOrders, toDbOrders } from "../commons/db"
import { Page } from "../components/commons/Paginator"
import { Order } from "../types/order"
import { waitObservable } from "../utils"
import { SortFilter } from "./SearchStore"

const MinKey = -Infinity
const MaxKey = +Infinity

export class Database {
  private ordersDb = observable<IDBPDatabase<SmolDB> | undefined>(undefined)
  public lastUpdatedOrders = observable<number>(Date.now())

  constructor(private store: Store) {
    openSmolDb().then((db) => this.ordersDb.set(db))
  }

  storeOrders = async (orders: Order[]) => {
    const db = await waitObservable(this.ordersDb)
    storeOrders(db, { open: orders })
    this.notifyUpdate()
  }

  setStatus = async (hashes: string[], status: OrderStatus) => {
    if (hashes.length === 0) return

    const db = await waitObservable(this.ordersDb)
    const tx = db.transaction('orders', 'readwrite')

    // Maybe iterating the whole db is too much
    // TODO: Do this in a smarter way
    const range = IDBKeyRange.bound([0, MinKey, MinKey, MinKey], [0, MaxKey, MaxKey, MaxKey])
    let cursor = await tx.store.index(CompoundIndexAmount).openCursor(range)
    while (cursor) {
      const val = { ...cursor.value }
      if (hashes.includes(val.hash)) {
        val.status = status
        cursor.update(val)
      }
      cursor = await cursor.continue()
    }

    await tx.done

    this.notifyUpdate()
  }

  notifyUpdate = () => {
    this.lastUpdatedOrders.set(Date.now())
  }

  // TODO This should be to return multiple offers
  // because multiple offers may exist for the same NFT
  // then the frontend should either present all or pick one

  // TODO x2 Also we need to tell the user if it has two orders for the same NFT
  // because one is still going to be valid in case they re-buy the asset
  getOrderForItem = async (
    collection: string,
    id: ethers.BigNumberish
  ): Promise<Order | undefined> => {
    const db = await waitObservable(this.ordersDb)
    const res = await db.getAllFromIndex('orders', CompoundIndexSellToken, [0, collection, ethers.BigNumber.from(id).toString()])
    if (!res || res.length === 0) return undefined
    if (res.length === 1) return fromDbOrders(res)[0]
    return fromDbOrders(res.sort((a, b) => a.askAmountOrIdNumber - b.askAmountOrIdNumber))[0]
  }

  getSortedOrders = async (sortFilter: SortFilter, page?: Page, collection?: string): Promise<{orders: Order[], total: number}> => {
    const sortType = sortFilter === 'recent-listing' ? 'expiration' : 'price'
    const inverse = sortFilter === 'recent-listing' ? true : sortFilter === 'high-low-price' ? true : false

    const start = page?.start ?? 0
    const end = page?.end ?? 9
    const count = end - start

    return this.getOrders({ collection, sort: sortType, status: 'open', inverse, count, skip: start })
  }

  getOrders = async (props: {
    sort?: 'expiration' | 'price',
    collection?: string,
    status: 'open' | 'canceled' | 'executed',
    count?: number,
    skip?: number,
    from?: ethers.BigNumberish,
    inverse?: boolean
  }): Promise<{ orders: Order[], total: number }> => {
    const started = new Date().getTime()

    const { sort, collection, status, from, inverse, count, skip } = props
    const db = await waitObservable(this.ordersDb)

    const rp1 = status === 'open' ? [0, 0] : status === 'canceled' ? [1, 1] : [2, 2]
    const rp3 = collection ? [collection, collection] : [MinKey, MaxKey]

    const range = IDBKeyRange.bound(
      [rp1[0], from && inverse ? parseFloat(ethers.BigNumber.from(from).toString()) : MinKey, rp3[0]],
      [rp1[1], from && !inverse ? parseFloat(ethers.BigNumber.from(from).toString()) : MaxKey, rp3[1]]
    )

    const tx = db.transaction('orders', 'readonly')
    const index = sort === 'expiration' ? CompoundIndexExpiration : CompoundIndexAmount

    const res: DbOrder[] = []
    let cursor = await tx.store.index(index).openCursor(range, inverse ? 'prev' : 'next')

    // HOTFIX: Disable pagination
    // it seems to be broken, so we load the whole db and sort / slice in memory
    // this is not efficient but it will work until we make the db work correctly

    // TODO: There are better ways to skip values
    // so... find a way to optimize this
    let badResults = 0

    if (skip && skip > 0) {
      for (let i = 0; cursor && i < skip; i++) {
        const val = { ...cursor.value }

        if (
          // Duplicated orders are ignored
          (res.find((c) => c.sellAmountOrId === val.sellAmountOrId && c.sellToken === val.sellToken) !== undefined) ||
          // Orders for the wrong collection are ignored too
          (collection && cursor.value.sellToken !== collection)
        ) {
          i--
          badResults++
        }

        cursor = await cursor.continue()
      }
    }

    for (let i = 0; cursor && (!count || i < count); i++) {
      const val = { ...cursor.value }
      if (
        // Duplicated orders are ignored
        (res.find((c) => c.sellAmountOrId === val.sellAmountOrId && c.sellToken === val.sellToken) !== undefined) ||
        // Orders for the wrong collection are ignored too
        (collection && cursor.value.sellToken !== collection)
      ) {
        i--
        badResults++
      } else {
        res.push({ ...val })
      }

      cursor = await cursor.continue()
    }

    // let sorted: DbOrder[]

    // if (sort === 'expiration') {
    //   if (inverse) {
    //     sorted = res.sort((a, b) => b.expirationNumber - a.expirationNumber)
    //   } else {
    //     sorted = res.sort((a, b) => a.expirationNumber - b.expirationNumber)
    //   }
    // } else {
    //   if (inverse) {
    //     sorted = res.sort((a, b) => b.askAmountOrIdNumber - a.askAmountOrIdNumber)
    //   } else {
    //     sorted = res.sort((a, b) => a.askAmountOrIdNumber - b.askAmountOrIdNumber)
    //   }
    // }

    // const sliced = (skip !== undefined && count !== undefined) ? sorted.slice(skip, skip + count) : sorted

    console.log(`[Database] Query database result ${new Date().getTime() - started}ms`)

    return {
      orders: fromDbOrders(res),
      total: (await tx.store.index(index).count(range)) - badResults
    }
  }
}
