import { expose } from 'comlink'
import { openSmolDb, storeOrders } from '../commons/db'
import { cleanOrders, filterStatus } from '../commons/orders'
import { STATIC_PROVIDER } from '../constants'
import { Order } from '../types/order'

type Waku = {
  processWakuOrders: (orders: Order[]) => Promise<void>
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
    const { open } = await filterStatus(STATIC_PROVIDER, ordersClean)
    const db = await pdb
    await storeOrders(db, open)
    console.log(`[Waku worker] processed ${orders.length} got open ${open.length}`)
  }
}

// Expose API
expose(api)
