import { ethers } from "ethers"
import { DBSchema, IDBPDatabase, openDB } from "idb"
import { Order } from "../types/order"

export const CompoundIndexAmount = 'status, askAmountOrIdNumber, sellToken'
export const CompoundIndexExpiration = 'status, expirationNumber, sellToken'
export const CompoundIndexSellToken = 'status, sellToken, sellAmountOrId'

export enum OrderStatus {
  Open = 0,
  Closed = 1,
  Canceled = 2,
  BadOwner = 3
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
  status: OrderStatus
}

export interface SmolDB extends DBSchema {
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


export function toDbOrders(orders: Order[], status: OrderStatus): DbOrder[] {
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

export function fromDbOrders(orders: DbOrder[]): Order[] {
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

export function openSmolDb() {
  return openDB<SmolDB>('Orders', 1, {
    upgrade(db) {
      const store = db.createObjectStore('orders', {
        keyPath: 'hash'
      })
      store.createIndex(CompoundIndexAmount, ['status', 'askAmountOrIdNumber', 'sellToken'])
      store.createIndex(CompoundIndexExpiration, ['status', 'expirationNumber', 'sellToken'])
      store.createIndex(CompoundIndexSellToken, ['status', 'sellToken', 'sellAmountOrId'])
      store.createIndex('seller', 'seller')
    }
  })
}

export async function storeOrders(
  db: IDBPDatabase<SmolDB>,
  orders: {
    open?: Order[],
    executed?: Order[],
    canceled?: Order[],
    badOwner?: Order[]
  }
): Promise<number> {
  const dbOrders = { 
    open: orders.open ? toDbOrders(orders.open, OrderStatus.Open) : [],
    executed: orders.executed ? toDbOrders(orders.executed, OrderStatus.Closed) : [],
    canceled: orders.canceled ? toDbOrders(orders.canceled, OrderStatus.Canceled) : [],
    badOwned: orders.badOwner ? toDbOrders(orders.badOwner, OrderStatus.BadOwner) : []
  }

  const allOrders = [
    ...dbOrders.open,
    ...dbOrders.executed,
    ...dbOrders.canceled,
    ...dbOrders.badOwned,
  ]

  if (allOrders.length === 0) return 0

  const tx = db.transaction('orders', 'readwrite')

  const exists = await Promise.all(allOrders.map((o) => tx.store.getKey(o.hash)))
  const toSave = allOrders.filter((_, i) => exists[i] === undefined)
  await Promise.all(toSave.map((o) => tx.store.add(o)))

  await tx.done

  return allOrders.length
}

export async function filterExistingOrders(db: IDBPDatabase<SmolDB>, orders: Order[]): Promise<Order[]> {
  const tx = db.transaction('orders', 'readonly')

  const exists = await Promise.all(orders.map((o) => tx.store.getKey(o.hash)))
  await tx.done

  return orders.filter((_, i) => exists[i] === undefined)
}
