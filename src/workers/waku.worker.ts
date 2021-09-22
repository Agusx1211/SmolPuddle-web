import { expose } from 'comlink'
import { filterExistingOrders, openSmolDb, storeOrders } from '../commons/db'
import { cleanOrders, filterStatus } from '../commons/orders'
import { STATIC_PROVIDER } from '../constants'
import { Order } from '../types/order'

type Waku = {
  processWakuOrders: (orders: Order[]) => Promise<number>
}

export type WakuWorker = Worker & Waku

export default {} as typeof Worker & { new (): WakuWorker }

const pdb = openSmolDb()


// Define API
const api: Waku = {
  // TODO: This worker should implement all Waku logic
  // this is a stopgap solution because we need to move this logic off main thread asap
  processWakuOrders: async (orders: Order[]) => {
    const ordersClean = cleanOrders(orders)
    const db = await pdb
    const filterOrders = await filterExistingOrders(db, ordersClean)
    const filtered = await filterStatus(STATIC_PROVIDER, filterOrders)
    const res = await storeOrders(db, filtered)
    console.log(`[Waku worker] processed ${orders.length}, filtered ${filterOrders.length} got open ${filtered.open.length}`)
    return res
  }
}

// Expose API
expose(api)
