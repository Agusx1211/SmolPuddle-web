import { Store } from "."
import { Order } from "../types/order"
import { chunks, serially } from "../utils"
import { OrderbookStore } from "./OrderbookStore"

const MaxPost = 1000
const APIs: { post: string, get: string }[] = [{
  get: "https://server.smolpuddle.io/get",
  post: "https://server.smolpuddle.io/post"
}]

export class ServerStore {
  constructor(private store: Store) {}

  async postOrders(input: Order[]) {
    const orderChunks = chunks(input, MaxPost)
    return serially(orderChunks, async (orders) => {
      return serially(APIs, async (api) => {
        console.log("Posted", orderChunks.length, orders.length, "to", api.post)
        return fetch(api.post, {
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
          body: JSON.stringify(orders)
        })
      }, (error, api) => {
        console.warn("error publish orders chunk to", api.post.includes, error)
      })
    })
  }

  async syncOrders() {
    return serially(APIs, async (api) => {
      return fetch(api.get).then(async (response) => {
        const orders = await response.json() as Order[]
        console.log("Got", orders.length, "from", api.get)
        return this.store.get(OrderbookStore).saveOrders(orders)
      })
    }, (error, api) => {
      console.warn("error loading orders from", api.post.includes, error)
    })
  }
}
