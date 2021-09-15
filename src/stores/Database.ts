import { openDB } from "idb";
import { Store } from ".";

export type DbOrder = {
  hash: string,
  currency: number,
  sell: {
    token: Address,
    amountOrId: ethers.BigNumber
  },
  ask: {
    token: Address,
    amountOrId: ethers.BigNumber
  }
  seller: Address,
  expiration: ethers.BigNumber,
  salt: string,
  fees: {
    recipient: Address,
    amontOrId: ethers.BigNumber
  }[],
  signature: string
}

export class Database {
  private ordersDb: any

  constructor(private store: Store) {
    openDB('Orders', 1, {
      upgrade(db) {
        const store = db.createObjectStore('orders', {
          keyPath: 'hash'
        })
        store.createIndex('sellToken', 'sell.token')
        store.createIndex('seller', 'seller')
      }
    })
  }
}
