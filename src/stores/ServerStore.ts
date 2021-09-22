import { Store } from "."
import Api, { ApiWorker } from '../workers/api.worker'
import { Remote, wrap } from 'comlink'
import { Order } from "../types/order"
import { Database } from "./Database"

export class ServerStore {
  private workerApi: Remote<ApiWorker>

  constructor(private store: Store) {
    const workerInstance = new Api()
    this.workerApi = wrap<ApiWorker>(workerInstance)
  }

  async postOrders(input: Order[]) {
    this.workerApi.syncToAPIs(input)
  }

  async syncOrders() {
    this.workerApi.syncFromAPIs().then(() => {
      this.store.get(Database).notifyUpdate()
    })
  }
}
