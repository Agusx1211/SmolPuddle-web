import { ethers } from "ethers"
import { observable } from "micro-observables"
import { Store } from "."

export type CreateTransferTarget = {
  collection: string,
  id: ethers.BigNumberish
}

export class CreateTransferStore {
  public target = observable<CreateTransferTarget | undefined>(undefined)
  public formOpened = this.target.select((t) => t !== undefined)

  constructor(private store: Store) {}

  openCreateTransfer = (target: CreateTransferTarget) => {
    if (this.formOpened.get()) return console.warn("nft transfer in process")
    this.target.set(target)
  }

  closeCreateTransfer = () => {
    this.target.set(undefined)
  }
}