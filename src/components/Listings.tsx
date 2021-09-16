
import { Container, Grid } from "@material-ui/core"
import { useEffect, useMemo, useState } from "react"
import { useObservable, useStore } from "../stores"
import { Database } from "../stores/Database"
import { NftStore } from "../stores/NftStore"
import { SearchStore } from "../stores/SearchStore"
import { WakuStore } from "../stores/WakuStore"
import { Order } from "../types/order"
import { set } from "../utils"
import { Loading } from "./commons/Loading"
import { Page, Paginator } from "./commons/Paginator"
import { ItemCard } from "./ItemCard"

export function Listings() {
  const wakuStore = useStore(WakuStore)
  const nftStore = useStore(NftStore)
  const searchStore = useStore(SearchStore)
  const databaseStore = useStore(Database)

  const wakuLoaded = useObservable(wakuStore.isInitialized)
  const sortFilter = useObservable(searchStore.sortingFilter)
  const lastUpdated = useObservable(databaseStore.lastUpdatedOrders)

  const [listings, setListings] = useState<Order[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState<Page>()

  const collections = useMemo(() => set(listings?.map((o) => o.sell.token) ?? []), [listings])

  useEffect(() => {
    // Set to recent listing by default
    searchStore.setSortingFilter("recent-listing")
  }, [])

  useEffect(() => {
    databaseStore.getSortedOrders(sortFilter, page).then(({ orders, total }) => {
      setListings(orders.map((o) => o))
      setTotal(total)
    })
  }, [lastUpdated, sortFilter, page])

  useEffect(() => {
    collections.map((c) => nftStore.fetchCollectionInfo(c))
  }, [collections, nftStore])

  const slicedListings = listings

  useEffect(() => {
    const difCollections = set(slicedListings.map((o) => o.sell.token))
    difCollections.map((c) => nftStore.fetchCollectionInfo(c))
  }, [slicedListings])

  return <Container>
    <Grid
      container
      spacing={6}
      direction="row"
      justifyContent="center"
      alignItems="center"
    >
    { (!wakuLoaded && slicedListings.length === 0) && <div>No listings found</div>}
    { slicedListings && slicedListings.map((order, i) => <Grid key={`listing-${i}-${order.hash}`} item xs={11} md={4}>
      <ItemCard collection={order.sell.token} id={order.sell.amountOrId} />
    </Grid>)}
  </Grid>
  <Loading loading={!wakuLoaded} />
  <Paginator total={total} onPage={setPage} />
</Container>
}
