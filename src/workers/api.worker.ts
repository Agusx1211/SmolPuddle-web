import { expose } from 'comlink'
import { openSmolDb, storeOrders } from '../commons/db'
import { filterStatus } from '../commons/orders'
import { STATIC_PROVIDER } from '../constants'
import { Order } from '../types/order'
import { chunks, serially } from '../utils'

type Api = {
  syncFromAPIs: () => void,
  syncToAPIs: (input: Order[]) => void
}

export type ApiWorker = Worker & Api

export default {} as typeof Worker & { new (): ApiWorker }

const pdb = openSmolDb()

const MaxPost = 1000

const APIs: { post: string, get: string }[] = [{
  get: "https://server.smolpuddle.io/get",
  post: "https://server.smolpuddle.io/post"
}]


// Define API
const api: Api = {
  syncFromAPIs: async () => {
    const db = await pdb

    return serially(APIs, async (api) => {
      return fetch(api.get).then(async (response) => {
        const orders = await response.json() as Order[]
        console.log("[ApiWorker] Got raw ", orders.length, "from", api.get)

        // TODO: Skip orders that already exist on the db
        const { open } = await filterStatus(STATIC_PROVIDER, orders)
        await storeOrders(db, open)

        console.log("[ApiWorker] Got open ", open.length, "from", api.get)
      })
    }, (error, api) => {
      console.warn("[ApiWorker] error loading orders from", api.post.includes, error)
    })
  },
  syncToAPIs: async(input: Order[]) => {
    const orderChunks = chunks(input, MaxPost)
    return serially(orderChunks, async (orders) => {
      return serially(APIs, async (api) => {
        console.log("[ApiWorker] Posted", orderChunks.length, orders.length, "to", api.post)
        return fetch(api.post, {
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
          body: JSON.stringify(orders)
        })
      }, (error, api) => {
        console.warn("[ApiWorker] error publish orders chunk to", api.post.includes, error)
      })
    })
  }
}

// Expose API
expose(api)
