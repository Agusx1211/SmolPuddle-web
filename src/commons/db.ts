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

export async function storeOrders(db: IDBPDatabase<SmolDB>, orders: Order[]) {
  const dbOrders = toDbOrders(orders, OrderStatus.Open)
  const tx = db.transaction('orders', 'readwrite')

  let writeList = dbOrders.map((o) => o.hash)
  let cursor = await tx.store.openCursor()
  while (cursor && cursor !== null) {
    if (writeList.includes(cursor?.value?.hash)) {
      const hash = cursor?.value?.hash
      writeList = writeList.filter((o) => o !== hash)
    }
    cursor = await cursor.continue()
  }

  const writeObs = writeList.map((s) => dbOrders.find((o) => o.hash === s))
  await Promise.all(writeObs.map((dbo) => {
    return dbo ? tx.store.add(dbo) : undefined
  }))

  await tx.done
}
