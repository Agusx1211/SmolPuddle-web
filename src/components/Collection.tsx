import { Container, Grid } from "@material-ui/core"
import { ethers } from "ethers"
import { useEffect, useMemo, useState } from "react"
import { useParams } from "react-router"
import { useObservable, useStore } from "../stores"
import { CollectionsStore } from "../stores/CollectionsStore"
import { Database } from "../stores/Database"
import { NftStore } from "../stores/NftStore"
import { SearchStore } from "../stores/SearchStore"
import { Loading } from "./commons/Loading"
import { Paginator, Page } from "./commons/Paginator"
import { ItemCard } from "./ItemCard"

export function Collection(props: any) {
  const { collection } = useParams<{ collection: string }>()

  const nftStore = useStore(NftStore)
  const collectionsStore = useStore(CollectionsStore)
  const databaseStore = useStore(Database)
  const searchStore = useStore(SearchStore)
  
  const sortFilter = useObservable(searchStore.sortingFilter)
  const lastUpdate = useObservable(databaseStore.lastUpdatedOrders)
  const knownItems = useObservable(collectionsStore.itemsOfCollection(collection))

  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState<Page>()
  const [listingIds, setListingIds] = useState<ethers.BigNumber[]>([])
  const [listingsTotal, setListingsTotal] = useState(0)

  useEffect(() => {
    databaseStore.getSortedOrders(sortFilter, page, collection).then(({ orders, total }) => {
      // TODO: Add known collections
      setListingIds(orders.map((o) => o.sell.amountOrId))
      setListingsTotal(total)
    })
  }, [lastUpdate, sortFilter, page, collection])

  const { total, ids } = useMemo(() => {
    const filteredKnown = knownItems.filter((i) => !listingIds.find((c) => c.eq(i)))
    const total = filteredKnown.length + listingsTotal
    const start = page?.start ?? 0
    const end = page?.end ?? 9
    const count = end - start

    if (listingIds.length >= count) return { ids: listingIds, total }

    const startKnown = start
    const endKnown = startKnown + count - listingIds.length

    return { ids: [...listingIds, ...filteredKnown.slice(startKnown, endKnown)], total }
  }, [knownItems, listingIds, listingsTotal])

  useEffect(() => {
    // Set to lowest first by default
    searchStore.setSortingFilter("low-high-price")
  }, [])

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
      { (!loading && ids.length === 0) && <div>No items found</div>}
      { ids.map((item) => <Grid key={`citem-${item.toString()}`} item xs={11} md={4}>
        <ItemCard key={`item${item}`} collection={collection} id={item} />
      </Grid>)}
    </Grid>
    <Loading loading={loading} />
    <Paginator total={total} onPage={setPage} />
  </Container>
}
