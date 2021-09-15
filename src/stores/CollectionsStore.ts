import { ethers } from "ethers"
import { observable } from "micro-observables"
import { Store } from "."
import { ERC721Abi } from "../abi/ERC721"
import { Address, parseAddress } from "../types/address"
import { set } from "../utils"
import { LocalStore } from "./LocalStore"
import { Web3Store } from "./Web3Store"

export const TransferERC721Event = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"

export const DefaultCollections = [
  "0xC36442b4a4522E871399CD717aBDD847Ab11FE88", // Uniswap position V3
  "0x71f5C328241fC3e03A8c79eDCD510037802D369c", // CastleArbiGenOne
  "0xEa521f642D1eE05aCA25979B7B6d7C83b24aA901", 
  "0x4772fB92e6606c87f7cDDcCDB880f7677768815c", // Arbipunks
  "0x93C5a735df4e2Fa818A53a509734e1a02954BB78", // Metaverse Marauders 
  "0x3ff697d3972bc8493ef459ce2a2b8961756bb217", // Crypto Gems
  "0x8F4cBC81589Ba28B67C371EaB3d696Ad67B25c24"  // Deevy
]

export const isDefaultCollection = (contractAddr: string) => {
  const addr = parseAddress(contractAddr)
  return addr ? DefaultCollections.includes(addr) : false
}

export class CollectionsStore {
  public savedCollections = new LocalStore<Address[], Address[]>("@smolpuddle.saved.collections", [])
  public allItemsOfCollection = observable<Record<string, number[]>>({})
  public knownCollections = this.savedCollections.observable.select((s) => set([...DefaultCollections, ...s]))

  constructor(private store: Store) {
    const web3store = this.store.get(Web3Store)
    this.loadCollections(web3store.provider.get())
  }

  loadCollections = async (provider: ethers.providers.Provider) => {
    try {
      const block = await provider.getBlock('latest')
      const lastBlock = ethers.BigNumber.from(block.number.toString()).sub(1024).toHexString()
      const logs = await provider.getLogs({ fromBlock: lastBlock, toBlock: 'latest', topics: [TransferERC721Event]})
      const erc721collections = logs.filter((l) => l.topics.length === 4)
      erc721collections.forEach((log) => this.saveCollection(log.address))
    } catch (e) {
      console.warn("error loading collections", e)
    }
  }

  itemsOfCollection = (collection: string) => this.allItemsOfCollection.select((allItems) => {
    const addr = parseAddress(collection) ?? collection
    return allItems[addr] ?? []
  })

  saveCollection = (collection: string) => {
    const addr = parseAddress(collection)
    if (addr === undefined) return

    this.savedCollections.update((known) => set([...known, addr]))
  }

  fetchCollectionItems = async (collection: string, force: boolean = false) => {
    const addr = parseAddress(collection)
    if (addr === undefined) return console.warn("invalid address")

    this.saveCollection(addr)

    if (!force && this.allItemsOfCollection.get()[addr] !== undefined) return console.info("collection cache hit", addr)

    // There may be better ways of fetching all items of a collection
    // but for now we resort to loading the total supply and assuming [0 ... totalSupply] items exist
    const provider = this.store.get(Web3Store).provider.get()
    const contract = new ethers.Contract(addr, ERC721Abi).connect(provider)

    try {
      const totalSupply = await contract.totalSupply()
      const psupply = totalSupply.toNumber()
      const supply = Math.min(psupply, 20000)
      if (psupply !== supply) console.warn("Supply too high", addr, "capped", psupply, supply)
  
      this.allItemsOfCollection.update((all) => {
        all[addr] = new Array(totalSupply.toNumber()).fill(0).map((_, i) => i)
        return Object.assign({}, all)
      })
    } catch (e) {
      console.warn("error loading total supply", addr, e)
    }
  }
}
