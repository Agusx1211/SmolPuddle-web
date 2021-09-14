
import { Container, Grid } from "@material-ui/core";
import { useEffect, useMemo, useState } from "react";
import { useObservable, useStore } from "../stores";
import { NftStore } from "../stores/NftStore";
import { OrderbookStore, StoredOrder } from "../stores/OrderbookStore";
import { SearchStore } from "../stores/SearchStore";
import { WakuStore } from "../stores/WakuStore";
import { set } from "../utils";
import { Loading } from "./commons/Loading";
import { Page, Paginator } from "./commons/Paginator";
import { ItemCard } from "./ItemCard";

export function Listings() {
  const orderBookStore = useStore(OrderbookStore)
  const wakuStore = useStore(WakuStore)
  const nftStore = useStore(NftStore)
  const searchStore = useStore(SearchStore)

  const listings = useObservable(orderBookStore.orders)
  const wakuLoaded = useObservable(wakuStore.isInitialized)
  const sortFilter = useObservable(searchStore.sortingFilter)

  const [sortedSliced, setSortedSliced] = useState<StoredOrder[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState<Page>()

  const collections = useMemo(() => set(listings?.map((i) => i.order.sell.token) ?? []), [listings])

  useEffect(() => {
    collections.map((c) => nftStore.fetchCollectionInfo(c))
  }, [collections, nftStore])

  useEffect(() => {
    collections.map((c) => nftStore.fetchCollectionInfo(c))
  }, [collections])

  useEffect(() => {
    const sorted = searchStore.sortOrders(listings)
    const sliced = sorted.slice(page?.start ?? 0, page?.end ?? 25)
    setSortedSliced(sliced)
    setTotal(sorted.length)
  }, [listings, sortFilter])

  useEffect(() => {
    const difCollections = set(sliced.map((c) => c.order.sell.token))
    difCollections.map((c) => nftStore.fetchCollectionInfo(c))
  }, [sliced])

  return <Container>
    <Grid
      container
      spacing={6}
      direction="row"
      justifyContent="center"
      alignItems="center"
    >
    { (!wakuLoaded && sortedSliced.length === 0) && <div>No listings found</div>}
    { sortedSliced && sortedSliced.map((listing, i) => <Grid key={`listing-${i}-${listing.order.hash}`} item xs={11} md={4}>
      <ItemCard collection={listing.order.sell.token} id={listing.order.sell.amountOrId} />
    </Grid>)}
  </Grid>
  <Loading loading={!wakuLoaded} />
  <Paginator total={total} onPage={setPage} />
</Container>
}
