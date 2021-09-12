import { ethers } from "ethers"
import { observable } from "micro-observables"
import { Store } from "."
import { ERC721Abi } from "../abi/ERC721"
import { Address, parseAddress } from "../types/address"
import { LocalStore } from "./LocalStore"
import { Web3Store } from "./Web3Store"


export class CollectionsStore {
  public knownCollections = new LocalStore<Address[], Address[]>("@smolpuddle.known.collections", [])
  public allItemsOfCollection = observable<Record<string, number[]>>({})

  constructor(private store: Store) {}

  itemsOfCollection = (collection: string) => this.allItemsOfCollection.select((allItems) => {
    const addr = parseAddress(collection) ?? collection
    return allItems[addr] ?? []
  })

  saveCollection = (collection: string) => {
    const addr = parseAddress(collection)
    if (addr === undefined) return

    this.knownCollections.update((known) => known.includes(addr) ? known : [...known, addr])
  }

  fetchCollectionItems = (collection: string, force: boolean = false) => {
    const addr = parseAddress(collection)
    if (addr === undefined) return console.warn("invalid address")

    if (!force && this.allItemsOfCollection.get()[addr] !== undefined) return console.info("collection cache hit", addr)

    // There may be better ways of fetching all items of a collection
    // but for now we resort to loading the total supply and assuming [0 ... totalSupply] items exist
    const provider = this.store.get(Web3Store).provider.get()
    const contract = new ethers.Contract(addr, ERC721Abi).connect(provider)

    contract.totalSupply().then((totalSupply: ethers.BigNumber) => {
      const psupply = totalSupply.toNumber()
      const supply = Math.min(psupply, 20000)
      if (psupply !== supply) console.warn("Supply too high", addr, "capped", psupply, supply)

      this.allItemsOfCollection.update((all) => {
        all[addr] = new Array(totalSupply.toNumber()).fill(0).map((_, i) => i)
        return Object.assign({}, all)
      })
    }).catch((e: any) => {
      console.warn("error loading total supply", addr, e)
    })
  }
}
