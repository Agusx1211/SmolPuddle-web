import { ethers } from "ethers"
import { openDB, IDBPDatabase, DBSchema } from "idb"
import { observable } from "micro-observables"
import { Store } from "."
import { Page } from "../components/commons/Paginator"
import { Order } from "../types/order"
import { waitObservable } from "../utils"
import { SortFilter } from "./SearchStore"

export enum OrderStatus {
  Open = 0,
  Closed = 1,
  Canceled = 2,
  BadOwner = 3
}

export const CompoundIndexAmount = 'status, askAmountOrIdNumber, sellToken'
export const CompoundIndexExpiration = 'status, expirationNumber, sellToken'
export const CompoundIndexSellToken = 'status, sellToken, sellAmountOrId'

const MinKey = -Infinity
const MaxKey = +Infinity

export type DbOrder = {
  hash: string,
  currency: number,
  sellToken: string,
  sellAmountOrId: string,
  askToken: string,
  askAmountOrId: string,
  askAmountOrIdNumber: number,
  seller: string,
  expiration: string,
  expirationNumber: number,
  salt: string,
  fees: {
    recipient: string,
    amontOrId: string
  }[],
  signature: string,
  status: OrderStatus
}

interface MyDB extends DBSchema {
  orders: {
    value: DbOrder
    key: string
    indexes: {
      [CompoundIndexAmount]: [number, number, string],
      [CompoundIndexExpiration]: [number, number, string],
      [CompoundIndexSellToken]: [number, string, string],
      'seller': string
    }
  }
}

function toDbOrders(orders: Order[], status: OrderStatus): DbOrder[] {
  return orders.map((o) => ({
    hash: o.hash,
    currency: o.currency,
    sellToken: o.sell.token,
    sellAmountOrId: ethers.BigNumber.from(o.sell.amountOrId).toString(),
    askToken: o.ask.token,
    askAmountOrId: ethers.BigNumber.from(o.ask.amountOrId).toString(),
    askAmountOrIdNumber: parseFloat(ethers.BigNumber.from(o.ask.amountOrId).toString()),
    seller: o.seller,
    expiration: ethers.BigNumber.from(o.expiration).toString(),
    expirationNumber: parseFloat(ethers.BigNumber.from(o.expiration).toString()),
    salt: o.salt,
    fees: o.fees.map((f) => ({ recipient: f.recipient, amontOrId: ethers.BigNumber.from(f.amontOrId).toString() })),
    signature: o.signature,
    status
  }))
}

function fromDbOrders(orders: DbOrder[]): Order[] {
  return orders.map((o) => ({
    hash: o.hash,
    currency: o.currency,
    sell: {
      token: o.sellToken,
      amountOrId: ethers.BigNumber.from(o.sellAmountOrId)
    },
    ask: {
      token: o.askToken,
      amountOrId: ethers.BigNumber.from(o.askAmountOrId)
    },
    seller: o.seller,
    expiration: ethers.BigNumber.from(o.expiration),
    salt: o.salt,
    fees: o.fees.map((f) => ({ recipient: f.recipient, amontOrId: ethers.BigNumber.from(f.amontOrId) })),
    signature: o.signature
  }))
}

export class Database {
  private ordersDb = observable<IDBPDatabase<MyDB> | undefined>(undefined)
  public lastUpdatedOrders = observable<number>(Date.now())

  constructor(private store: Store) {
    openDB<MyDB>('Orders', 1, {
      upgrade(db) {
        const store = db.createObjectStore('orders', {
          keyPath: 'hash'
        })
        store.createIndex(CompoundIndexAmount, ['status', 'askAmountOrIdNumber', 'sellToken'])
        store.createIndex(CompoundIndexExpiration, ['status', 'expirationNumber', 'sellToken'])
        store.createIndex(CompoundIndexSellToken, ['status', 'sellToken', 'sellAmountOrId'])
        store.createIndex('seller', 'seller')
      }
    }).then((db) => this.ordersDb.set(db))
  }

  storeOrders = async (orders: Order[]) => {
    const dbOrders = toDbOrders(orders, OrderStatus.Open)
    const db = await waitObservable(this.ordersDb)
    const tx = db.transaction('orders', 'readwrite')

    let writeList = dbOrders.map((o) => o.hash)
    let cursor = await tx.store.openCursor()
    while (cursor && cursor !== null) {
      if (writeList.includes(cursor?.value?.hash)) {
        writeList = writeList.filter((o) => o !== cursor?.value?.hash)
      }
      cursor = await cursor.continue()
    }

    const writeObs = writeList.map((s) => dbOrders.find((o) => o.hash === s))
    await Promise.all(writeObs.map((dbo) => {
      return dbo ? tx.store.add(dbo) : undefined
    }))

    await tx.done

    this.lastUpdatedOrders.set(Date.now())
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

    // await tx.done
    this.lastUpdatedOrders.set(Date.now())
  }

  getOrderForItem = async (
    collection: string,
    id: ethers.BigNumberish
  ): Promise<Order | undefined> => {
    const db = await waitObservable(this.ordersDb)
    const res = await db.getFromIndex('orders', CompoundIndexSellToken, [0, collection, ethers.BigNumber.from(id).toString()])
    return res ? fromDbOrders([res])[0] : undefined
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
    const { sort, collection, status, from, inverse, count, skip } = props
    const db = await waitObservable(this.ordersDb)

    const rp1 = status === 'open' ? [0, 1] : status === 'canceled' ? [1, 2] : [2, 3]
    const rp3 = collection ? [collection, collection] : [MinKey, MaxKey]

    const range = IDBKeyRange.bound(
      [rp1[0], from && inverse ? parseFloat(ethers.BigNumber.from(from).toString()) : MinKey, rp3[0]],
      [rp1[1], from && !inverse ? parseFloat(ethers.BigNumber.from(from).toString()) : MaxKey, rp3[1]]
    )

    const tx = db.transaction('orders', 'readonly')
    const index = sort === 'expiration' ? CompoundIndexExpiration : CompoundIndexAmount

    const res: DbOrder[] = []
    let cursor = await tx.store.index(index).openCursor(range, inverse ? 'prev' : 'next')

    // TODO: There are better ways to skip values
    // so... find a way to optimize this
    if (skip && skip > 0) {
      for (let i = 0; cursor && i < skip; i++) {
        cursor = await cursor.continue()
      }
    }

    let badResults = 0
    for (let i = 0; cursor && (!count || i < count); i++) {
      if (
        // Duplicated orders are ignored
        (res.find((c) => c.sellAmountOrId === cursor?.value.sellAmountOrId && c.sellToken === cursor.value.sellToken) !== undefined) ||
        // Orders for the wrong collection are ignored too
        (collection && cursor.value.sellToken !== collection)
      ) {
        i--
        badResults++
      } else {
        res.push({ ...cursor.value })
      }

      cursor = await cursor.continue()
    }

    return {
      orders: fromDbOrders(res),
      total: (await tx.store.index(index).count(range)) - badResults
    }
  }
}
