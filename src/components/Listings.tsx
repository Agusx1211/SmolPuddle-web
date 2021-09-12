import { Container, Grid } from "@material-ui/core";
import { useObservable, useStore } from "../stores";
import { OrderbookStore } from "../stores/OrderbookStore";
import { ItemCard } from "./ItemCard";

export function Listings() {
  const orderBookStore = useStore(OrderbookStore)
  const listings = useObservable(orderBookStore.orders)

  return <Container>
    <Grid
      container
      spacing={6}
      direction="row"
      justifyContent="center"
      alignItems="center"
    >
    { listings.length === 0 && <div>No listings found</div>}
    { listings && listings.slice(0, 25).map((listing) => <Grid item xs>
      <ItemCard key={`listing-${listing.order.hash}`} collection={listing.order.sell.token} id={listing.order.sell.amountOrId} />
    </Grid>)}
  </Grid>
</Container>
}
