import { ethers } from "ethers"
import { Store } from "."
import { Address } from "../types/address"
import { Web3Store } from "./Web3Store"

export class ERC721Stores {
  public tokens: 

  constructor(private store: Store) {}

  fetchTokenInfo = (contract: Address, id: ethers.BigNumber): any => {
    const provider = this.store.get(Web3Store).provider.get()
    
  }
}
