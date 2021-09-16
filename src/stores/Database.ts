import { ethers } from "ethers"
import { openDB, IDBPDatabase, DBSchema } from "idb"
import { observable } from "micro-observables"
import { Store } from "."
import { Order } from "../types/order"
import { waitObservable } from "../utils"

export enum OrderStatus {
  Closed = 1,
  Canceled = 2
}

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
  status?: OrderStatus.Closed | OrderStatus.Canceled
}

interface MyDB extends DBSchema {
  orders: {
    value: DbOrder
    key: string
    indexes: {
      'sellToken': string,
      'sellAmountOrId': string,
      'askAmountOrIdNumber': number,
      'seller': string,
      'expirationNumber': string,
      'status': number
    }
  }
}

function toDbOrders(orders: Order[]): DbOrder[] {
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
    signature: o.signature
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
        store.createIndex('sellToken', 'sellToken')
        store.createIndex('sellAmountOrId', 'sellAmountOrId')
        store.createIndex('askAmountOrIdNumber', 'askAmountOrIdNumber')
        store.createIndex('seller', 'seller')
        store.createIndex('expirationNumber', 'expirationNumber')
        store.createIndex('status', 'status')
      }
    }).then((db) => this.ordersDb.set(db))
  }

  storeOrders = async (orders: Order[]) => {
    console.log("store", orders.length)
    const dbOrders = toDbOrders(orders)
    console.log("wait db")
    const db = await waitObservable(this.ordersDb)
    console.log("got db")
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

    console.log("finished tx",)

    this.lastUpdatedOrders.set(Date.now())
  }

  setStatus = async (hashes: string[], status: OrderStatus) => {
    console.log("set status", hashes.length)
    const db = await waitObservable(this.ordersDb)

    const tx = db.transaction('orders', 'readwrite')

    let cursor = await tx.store.openCursor()
    while (cursor) {
      const val = { ...cursor.value }
      if (hashes.includes(val.hash)) {
        val.status = status
        console.log("update", val.hash)
        cursor.update(val)
      }
      cursor = await cursor.continue()
    }

    // await tx.done
    this.lastUpdatedOrders.set(Date.now())
  }

  getOrders = async (): Promise<Order[]> => {
    const db = await waitObservable(this.ordersDb)
    const orders = await db.getAllFromIndex('orders', 'askAmountOrIdNumber')
    return fromDbOrders(orders)
  }
}
