import { Container, Grid } from "@material-ui/core"
import { ethers } from "ethers"
import { useEffect, useMemo, useState } from "react"
import { useParams } from "react-router"
import { useObservable, useStore } from "../stores"
import { CollectionsStore } from "../stores/CollectionsStore"
import { NftStore } from "../stores/NftStore"
import { Collectible, OrderbookStore, StoredOrder } from "../stores/OrderbookStore"
import { SearchStore } from "../stores/SearchStore"
import { parseAddress } from "../types/address"
import { Loading } from "./commons/Loading"
import { Paginator, Page } from "./commons/Paginator"
import { ItemCard } from "./ItemCard"

export function Collection(props: any) {
  const { collection } = useParams<{ collection: string }>()

  const nftStore = useStore(NftStore)
  const collectionsStore = useStore(CollectionsStore)
  const orderbookStore = useStore(OrderbookStore)
  const searchStore = useStore(SearchStore)
  
  const knownItemsOfCollection = useObservable(collectionsStore.itemsOfCollection(collection))
  const sortFilter = useObservable(searchStore.sortingFilter)
  const listings = useObservable(orderbookStore.orders)

  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState<Page>()
  const [sortedCollection, setSortedCollection] = useState<Collectible[]>([])
  const [total, setTotal] = useState(0)

  useEffect(() => {
    const collectionAddr = parseAddress(collection)
    const all = [...knownItemsOfCollection, ...listings
      .filter((o) => parseAddress(o.order.sell.token) === collectionAddr)
      .map((o) => ethers.BigNumber.from(o.order.sell.amountOrId).toNumber())
    ]
    const itemsOfCollection =  all.filter((v, i) => all.indexOf(v) === i)
    
    const itemsWithOrders: Collectible[] = itemsOfCollection.map((i) => {
      console.log("got listing", i)
      const itemListing = listings.find((l) => (
        parseAddress(l.order.sell.token) === collectionAddr &&
        ethers.BigNumber.from(i).eq(l.order.sell.amountOrId)
      ))
      return { tokenId: i, order: itemListing }
    })
    
    const sorted = searchStore.sortCollectibles(itemsWithOrders)
    const sliced = sorted.slice(page?.start ?? 0, page?.end ?? 25)
    setSortedCollection(sliced)
    setTotal(sorted.length)
  }, [listings, sortFilter])

  useEffect(() => {
    setLoading(true)
    collectionsStore.fetchCollectionItems(collection).then(() => {
      setLoading(false)
    })
    nftStore.fetchCollectionInfo(collection)
  }, [nftStore, collectionsStore, collection, setLoading])

  return <Container>
    <Grid
      container
      spacing={6}
      direction="row"
      justifyContent="center"
      alignItems="center"
    >
      { (!loading && sortedCollection.length === 0) && <div>No items found</div>}
      { sortedCollection.map((item) => <Grid key={`citem-${item.tokenId}`} item xs={11} md={4}>
        <ItemCard key={`item${item}`} collection={collection} id={item.tokenId} />
      </Grid>)}
    </Grid>
    <Loading loading={loading} />
    <Paginator total={total} onPage={setPage} />
  </Container>
}
