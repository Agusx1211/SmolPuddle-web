import { expose } from 'comlink'
import { filterExistingOrders, openSmolDb, storeOrders } from '../commons/db'
import { cleanOrders, filterStatus } from '../commons/orders'
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
        serially(chunks(await response.json() as Order[], 256), async (chunk, i) => {
          console.log(`[ApiWorker] Got raw ${i}-${chunk.length}, from ${api.get}`)
          const ordersClean = cleanOrders(chunk)
          const filterOrders = await filterExistingOrders(db, ordersClean)
          const filtered = await filterStatus(STATIC_PROVIDER, filterOrders)
          await storeOrders(db, filtered)
          console.log(`[ApiWorker] Got open ${i}-${filtered.open.length}, filtered ${filterOrders.length}, from ${api.get}`)
        }, (e) => {
          console.warn("error processing chunk", e)
        })
      })
    }, (error, api) => {
      console.warn("[ApiWorker] error loading orders from", api.post, error.toString())
      console.error(error)
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
