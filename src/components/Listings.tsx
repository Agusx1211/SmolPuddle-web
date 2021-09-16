
import { Container, Grid } from "@material-ui/core";
import { useEffect, useMemo, useState } from "react";
import { useObservable, useStore } from "../stores";
import { Database } from "../stores/Database";
import { NftStore } from "../stores/NftStore";
import { OrderbookStore, StoredOrder } from "../stores/OrderbookStore";
import { SearchStore } from "../stores/SearchStore";
import { WakuStore } from "../stores/WakuStore";
import { set } from "../utils";
import { Loading } from "./commons/Loading";
import { Page, Paginator } from "./commons/Paginator";
import { ItemCard } from "./ItemCard";

export function Listings() {
  const orderbookStore = useStore(OrderbookStore)
  const wakuStore = useStore(WakuStore)
  const nftStore = useStore(NftStore)
  const searchStore = useStore(SearchStore)
  const databaseStore = useStore(Database)

  const wakuLoaded = useObservable(wakuStore.isInitialized)
  const sortFilter = useObservable(searchStore.sortingFilter)
  const lastUpdated = useObservable(databaseStore.lastUpdatedOrders)

  const [listings, setListings] = useState<StoredOrder[]>([])
  const [sortedListings, setSortedListings] = useState<StoredOrder[]>([])
  const [slicedListings, setSlicedListings] = useState<StoredOrder[]>([])
  const [page, setPage] = useState<Page>()

  const collections = useMemo(() => set(listings?.map((i) => i.order.sell.token) ?? []), [listings])

  useEffect(() => {
    // Set to recent listing by default
    searchStore.setSortingFilter("recent-listing")
  }, [])

  useEffect(() => {
    databaseStore.getOrders().then((orders) => {
      setListings(orders.map((o) => ({ order: o, lastSeen: 0 })))
    })
  }, [lastUpdated])

  useEffect(() => {
    collections.map((c) => nftStore.fetchCollectionInfo(c))
  }, [collections, nftStore])

  useEffect(() => {
    const sorted = searchStore.sortOrders(listings)
    setSortedListings(sorted)
  }, [listings, sortFilter])

  useEffect(() => {
    setSlicedListings(sortedListings.slice(page?.start ?? 0, page?.end ?? 25))
  }, [sortedListings, sortFilter, page])

  useEffect(() => {
    const difCollections = set(slicedListings.map((c) => c.order.sell.token))
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
    { slicedListings && slicedListings.map((listing, i) => <Grid key={`listing-${i}-${listing.order.hash}`} item xs={11} md={4}>
      <ItemCard collection={listing.order.sell.token} id={listing.order.sell.amountOrId} />
    </Grid>)}
  </Grid>
  <Loading loading={!wakuLoaded} />
  <Paginator total={sortedListings.length} onPage={setPage} />
</Container>
}
