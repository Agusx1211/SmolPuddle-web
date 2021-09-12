import { ethers } from "ethers"
import { observable } from "micro-observables"
import { Store } from "."
import { ERC721Abi } from "../abi/ERC721"
import { Address, parseAddress } from "../types/address"
import { CollectionMetadata, isMetadata, Metadata } from "../types/metadata"
import { safe } from "../utils"
import { IpfsStore, isIpfs } from "./IpfsStore"
import { Web3Store } from "./Web3Store"

type ItemMetadataStorage = Record<string, Record<string, Metadata>>
type CollectionMetadataStorage = Record<string, CollectionMetadata>

export class NftStore {
  // Maybe this shouldn't persist, or we should use indexdb
  // public metadata = new LocalStore<MetadataStorage, MetadataStorage>('@smolpuddle.known.metadata', {})
  public itemMetadatas = observable<ItemMetadataStorage>({})
  public collectionMetadatas = observable<CollectionMetadataStorage>({})

  constructor(private store: Store) {}

  metadataOfItem = (contractAddr: string, iid: ethers.BigNumberish) => this.itemMetadatas.select((itemMetadatas) => {
    const addr = parseAddress(contractAddr)
    if (!addr) return undefined

    const id = safe(() => ethers.BigNumber.from(iid))
    if (!id) return undefined

    return this.collectionMetadatas.select((collectionMetadatas) => {
      const tokenMetadata = itemMetadatas[addr]

      return {
        item: tokenMetadata ? tokenMetadata[id.toString()] : undefined,
        collection: collectionMetadatas[addr]
      }
    })
  })

  metadataOfCollection = (contractAddr: Address) => this.collectionMetadatas.select((collectionMetadatas) => {
    const addr = parseAddress(contractAddr)
    if (!addr) return undefined
    return collectionMetadatas[ethers.utils.getAddress(addr)]
  })

  fetchCollectionInfo = (contractAddr: string, force: boolean = false) => {
    const addr = safe(() => ethers.utils.getAddress(contractAddr))
    if (addr === undefined) return

    if (!force && this.metadataOfCollection(addr)?.get() !== undefined) return

    const provider = this.store.get(Web3Store).provider.get()
    const contract = new ethers.Contract(addr, ERC721Abi).connect(provider)

    contract.name().then((name: string) => {
      this.collectionMetadatas.update((val) => {
        if (val[addr] === undefined) val[addr] = {}
        val[addr].name = name
        return Object.assign({}, val)
      })
    }).catch((e: any) => {
      console.warn("error fetching contract name", addr, e)
    })

    contract.symbol().then((symbol: string) => {
      this.collectionMetadatas.update((val) => {
        if (val[addr] === undefined) val[addr] = {}
        val[addr].symbol = symbol
        return val
      })
    }).catch((e: any) => {
      console.warn("error fetching contract symbol", addr, e)
    })
  }

  fetchItemInfo = (contractAddr: string, iid: ethers.BigNumberish, force: boolean = false): any => {
    const addr = safe(() => ethers.utils.getAddress(contractAddr))
    if (addr === undefined) return

    const id = safe(() => ethers.BigNumber.from(iid))
    if (id === undefined) return

    if (!force && this.metadataOfItem(addr, id).get()?.item !== undefined) return

    const provider = this.store.get(Web3Store).provider.get()
    const contract = new ethers.Contract(addr, ERC721Abi).connect(provider)

    contract.tokenURI(id).then((uri: string) => {
      const url = isIpfs(uri) ? this.store.get(IpfsStore).mapToURI(uri) : uri
      fetch(url).then((response) => {
        response.json().then((json) => {
          if (isMetadata(json)) {
            this.itemMetadatas.update((val) => {
              if (!val[addr]) {
                val[addr] = {}
              }
    
              val[addr][id.toString()] = json
              return Object.assign({}, val)
            })
          } else {
            console.warn("drop metadata, parsing error", addr, id, response)
          }
        }).catch((e: any) => {
          console.warn("drop metadata, json parsing error", addr, id, uri, e)
        })
      }).catch((e: any) => {
        console.warn("error fetching metadata from uri", addr, id, uri, e)
      })
    }).catch((e: any) => {
      console.warn("error fetching metadata uri", addr, id, e)
    })
  }
}
