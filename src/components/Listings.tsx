
import { Container, Grid } from "@material-ui/core";
import { ethers } from "ethers";
import { useEffect, useMemo, useState } from "react";
import { useObservable, useStore } from "../stores";
import { NftStore } from "../stores/NftStore";
import { OrderbookStore } from "../stores/OrderbookStore";
import { WakuStore } from "../stores/WakuStore";
import { set } from "../utils";
import { Loading } from "./commons/Loading";
import { Page, Paginator } from "./commons/Paginator";
import { ItemCard } from "./ItemCard";

export function Listings() {
  const orderBookStore = useStore(OrderbookStore)
  const wakuStore = useStore(WakuStore)
  const nftStore = useStore(NftStore)

  const listings = useObservable(orderBookStore.orders)
  const wakuLoaded = useObservable(wakuStore.isInitialized)

  const [page, setPage] = useState<Page>()

  const collections = useMemo(() => set(listings?.map((i) => i.order.sell.token) ?? []), [listings])

  useEffect(() => {
    collections.map((c) => nftStore.fetchCollectionInfo(c))
  }, [collections, nftStore])

  const sorted = useMemo(() => {
    return listings.sort((a, b) => {
      const asp = ethers.BigNumber.from(a.order.ask.amountOrId)
      const bsp = ethers.BigNumber.from(b.order.ask.amountOrId)
      return asp.eq(bsp) ? 0 : asp.lt(bsp) ? -1 : 1
    })
  }, [listings])
  
  const sliced = useMemo(() => sorted.slice(page?.start, page?.end), [page, sorted])

  return <Container>
    <Grid
      container
      spacing={6}
      direction="row"
      justifyContent="center"
      alignItems="center"
    >
    { (!wakuLoaded && sliced.length === 0) && <div>No listings found</div>}
    { sliced && sliced.map((listing, i) => <Grid key={`listing-${i}-${listing.order.hash}`} item md={4}>
      <ItemCard collection={listing.order.sell.token} id={listing.order.sell.amountOrId} />
    </Grid>)}
  </Grid>
  <Loading loading={!wakuLoaded} />
  <Paginator total={sorted.length} onPage={setPage} />
</Container>
}
