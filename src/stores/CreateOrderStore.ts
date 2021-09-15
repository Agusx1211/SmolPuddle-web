import { ethers } from "ethers"
import { observable } from "micro-observables"
import { Store } from "."

export type CreateOrderTarget = {
  collection: string,
  id: ethers.BigNumberish
}

export class CreateOrderStore {
  public target = observable<CreateOrderTarget | undefined>(undefined)
  public formOpened = this.target.select((t) => t !== undefined)

  constructor(private store: Store) {}

  openCreateOrder = (target: CreateOrderTarget) => {
    if (this.formOpened.get()) return console.warn("order creation in process")
    this.target.set(target)
  }

  closeCreateOrder = () => {
    this.target.set(undefined)
  }
}

// export const CreateOrderStore = {
//   constructor: CreateOrderStoreClass,
//   tag: 'createorderstore'
// }
