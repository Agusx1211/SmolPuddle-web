import { Container, Grid } from "@material-ui/core"
import { useEffect, useState } from "react"
import { useParams } from "react-router"
import { useObservable, useStore } from "../stores"
import { CollectionsStore } from "../stores/CollectionsStore"
import { NftStore } from "../stores/NftStore"
import { Paginator, Page } from "./commons/Paginator"
import { ItemCard } from "./ItemCard"

export function Collection(props: any) {
  const { collection } = useParams<{ collection: string }>()

  const nftStore = useStore(NftStore)
  const collectionsStore = useStore(CollectionsStore)
  const itemsOfCollection = useObservable(collectionsStore.itemsOfCollection(collection))

  const [page, setPage] = useState<Page>()

  useEffect(() => {
    collectionsStore.fetchCollectionItems(collection)
    nftStore.fetchCollectionInfo(collection)
  })

  return <Container>
    <Grid
      container
      spacing={6}
      direction="row"
      justifyContent="center"
      alignItems="center"
    >
      { itemsOfCollection && itemsOfCollection.slice(page?.start, page?.end).map((item) => <Grid item xs>
        <ItemCard key={`item${item}`} collection={collection} id={item} />
      </Grid>)}
    </Grid>
    <Paginator total={itemsOfCollection.length} onPage={setPage} />
  </Container>
}
