import { ethers } from "ethers"
import { observable } from "micro-observables"
import { Store } from "."
import { ERC721Abi } from "../abi/ERC721"
import { Address, parseAddress } from "../types/address"
import { CollectionMetadata, isMetadata, Metadata } from "../types/metadata"
import { safe } from "../utils"
import { CollectionsStore } from "./CollectionsStore"
import { IpfsStore } from "./IpfsStore"
import { Web3Store } from "./Web3Store"

type ItemMetadataStorage = Record<string, Record<string, Metadata>>
type CollectionMetadataStorage = Record<string, CollectionMetadata>
type ItemOwnersStorage = Record<string, Record<string, string | undefined>>
type OwnedNftsStorage = Record<string, { collection: Address, id: ethers.BigNumber }[]>


export class NftStore {
  // Maybe this shouldn't persist, or we should use indexdb
  // public metadata = new LocalStore<MetadataStorage, MetadataStorage>('@smolpuddle.known.metadata', {})
  public itemMetadatas = observable<ItemMetadataStorage>({})
  public collectionMetadatas = observable<CollectionMetadataStorage>({})
  public itemOwners = observable<ItemOwnersStorage>({})
  public ownedNfts = observable<OwnedNftsStorage>({})

  constructor(private store: Store) {}

  nftsOf = (ownerAddr: string) => this.ownedNfts.select((ownedNfts) => {
    const addr = parseAddress(ownerAddr)
    if (!addr) return undefined

    return ownedNfts[addr] ?? []
  })

  ownerOf = (contractAddr: string, iid: ethers.BigNumberish) => this.itemOwners.select((itemOwners) => {
    const addr = parseAddress(contractAddr)
    if (!addr) return undefined

    const id = safe(() => ethers.BigNumber.from(iid))
    if (!id) return undefined

    const collection = itemOwners[addr]
    if (!collection) return undefined

    return collection[id.toString()]
  })

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

  fetchNftsOfOwner = async (ownerAddr: string) => {
    const addr = safe(() => ethers.utils.getAddress(ownerAddr))
    if (addr === undefined) return

    const knownCollections = this.store.get(CollectionsStore).knownCollections.get()
    const provider = this.store.get(Web3Store).provider.get()
    const knownNfts = await Promise.all(knownCollections.map(async (collection) => {
      try {
        const contract = new ethers.Contract(collection, ERC721Abi).connect(provider)
        const balance = await contract.balanceOf(addr)
        const ids = await Promise.all(new Array(balance.toNumber()).fill(0).map((_: any, i: number) => {
          return contract.tokenOfOwnerByIndex(addr, i)
        }))
        return { collection, ids: ids as ethers.BigNumber[] }
      } catch (e: any) {
        console.warn("error reading nfts for collection", addr, collection, e)
        return { collection, ids: [] }
      }
    }))

    const flat = knownNfts.reduce((p, nft) => {
      return [...p, ...nft.ids.map((id) => ({ collection: nft.collection, id}))]
    }, [] as { collection: Address, id: ethers.BigNumber }[])

    this.ownedNfts.update((val) => {
      val[addr] = flat
      return Object.assign({}, val)
    })
  }

  fetchOwnerInfo = async (contractAddr: string, iid: ethers.BigNumberish, force: boolean = false) => {
    const addr = safe(() => ethers.utils.getAddress(contractAddr))
    if (addr === undefined) return

    const id = safe(() => ethers.BigNumber.from(iid))
    if (id === undefined) return

    if (!force && this.ownerOf(addr, id).get() !== undefined) return

    const provider = this.store.get(Web3Store).provider.get()
    const contract = new ethers.Contract(addr, ERC721Abi).connect(provider)

    const setOwner = (owner: string) => {
      this.itemOwners.update((val) => {
        if (val[addr] === undefined) val[addr] = {}
        val[addr][id.toString()] = owner
        return Object.assign({}, val)
      })
    }

    try {
      const owner = await contract.ownerOf(id)
      const ownerAddr = parseAddress(owner)
      if (!ownerAddr) return console.warn("error parsing owner address", owner)
      setOwner(ownerAddr)
    } catch (e: any) {
      console.warn(e)
      // TODO: This may be a real error
      // but some contracts revert when the nft is not owned
      // figure a way of differenciate
      setOwner(ethers.constants.AddressZero)
    }

    return
  }

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
      fetch(this.store.get(IpfsStore).mapToURI(uri)).then((response) => {
        response.json().then((json) => {
          if (isMetadata(json)) {
            this.itemMetadatas.update((val) => {
              const meta = Object.assign({}, json)
              meta.image = this.store.get(IpfsStore).mapToURI(meta.image)

              if (!val[addr]) {
                val[addr] = {}
              }

              val[addr][id.toString()] = meta
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

// export const NftStore = {
//   constructor: NftStoreClass,
//   tag: 'nftstore'
// }
