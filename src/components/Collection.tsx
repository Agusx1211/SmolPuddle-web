import { Container, Grid } from "@material-ui/core"
import { ethers } from "ethers"
import { useEffect, useMemo, useState } from "react"
import { useParams } from "react-router"
import { useObservable, useStore } from "../stores"
import { CollectionsStore } from "../stores/CollectionsStore"
import { NftStore } from "../stores/NftStore"
import { OrderbookStore } from "../stores/OrderbookStore"
import { parseAddress } from "../types/address"
import { Loading } from "./commons/Loading"
import { Paginator, Page } from "./commons/Paginator"
import { ItemCard } from "./ItemCard"

export function Collection(props: any) {
  const { collection } = useParams<{ collection: string }>()

  const nftStore = useStore(NftStore)
  const collectionsStore = useStore(CollectionsStore)
  const orderbookStore = useStore(OrderbookStore)

  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState<Page>()

  const knownItemsOfCollection = useObservable(collectionsStore.itemsOfCollection(collection))
  const listings = useObservable(orderbookStore.orders)

  const itemsOfCollection = useMemo(() => {
    const collectionAddr = parseAddress(collection)
    const all = [...knownItemsOfCollection, ...listings
      .filter((o) => parseAddress(o.order.sell.token) === collectionAddr)
      .map((o) => ethers.BigNumber.from(o.order.sell.amountOrId).toNumber())
    ]

    return all.filter((v, i) => all.indexOf(v) === i)
  }, [knownItemsOfCollection, listings])

  const itemsWithOrders = useMemo(() => {
    const collectionAddr = parseAddress(collection)
    return itemsOfCollection.map((i) => {
      console.log("got listing", i)
      const itemListing = listings.find((l) => (
        parseAddress(l.order.sell.token) === collectionAddr &&
        ethers.BigNumber.from(i).eq(l.order.sell.amountOrId)
      ))

      return { id: i, listing: itemListing }
    })
  }, [collection, listings, itemsOfCollection])

  const sorted = useMemo(() => {
    return itemsWithOrders.sort((a, b) => {
      const asp = a.listing ? ethers.BigNumber.from(a.listing.order.ask.amountOrId) : undefined
      const bsp = b.listing ? ethers.BigNumber.from(b.listing.order.ask.amountOrId) : undefined
      if (asp && bsp) return asp.eq(bsp) ? 0 : asp.lt(bsp) ? -1 : 1
      if (asp) return -1
      return 1
    })
  }, [itemsWithOrders])

  useEffect(() => {
    setLoading(true)
    collectionsStore.fetchCollectionItems(collection).then(() => {
      setLoading(false)
    })
    nftStore.fetchCollectionInfo(collection)
  }, [nftStore, collectionsStore, collection, setLoading])

  const sliced = useMemo(() => sorted.slice(page?.start ?? 0, page?.end ?? 25), [page, sorted])

  return <Container>
    <Grid
      container
      spacing={6}
      direction="row"
      justifyContent="center"
      alignItems="center"
    >
      { (!loading && sliced.length === 0) && <div>No items found</div>}
      { sliced.map((item) => <Grid key={`citem-${item.id}`} item xs={11} md={4}>
        <ItemCard key={`item${item}`} collection={collection} id={item.id} />
      </Grid>)}
    </Grid>
    <Loading loading={loading} />
    <Paginator total={sorted.length} onPage={setPage} />
  </Container>
}
