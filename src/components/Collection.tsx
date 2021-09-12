import React from 'react'
import { Container, Grid } from "@material-ui/core"
import { useEffect } from "react"
import { useParams } from "react-router"
import { useObservable, useStore } from "../stores"
import { CollectionsStore } from "../stores/CollectionsStore"
import { NftStore } from "../stores/NftStore"
import { ItemCard } from "./ItemCard"

export function Collection() {
  const { collection } = useParams<{ collection: string }>()

  const nftStore = useStore(NftStore)
  const collectionsStore = useStore(CollectionsStore)
  const itemsOfCollection = useObservable(collectionsStore.itemsOfCollection(collection))

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
      { itemsOfCollection && itemsOfCollection.slice(0, 25).map((item) => <Grid item xs>
        <ItemCard key={`item${item}`} collection={collection} id={item} />
      </Grid>)}
    </Grid>
  </Container>
}
