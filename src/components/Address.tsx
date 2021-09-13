import { Container, Grid } from "@material-ui/core"
import { useEffect, useMemo, useState } from "react"
import { useParams } from "react-router"
import { useObservable, useStore } from "../stores"
import { NftStore } from "../stores/NftStore"
import { set } from "../utils"
import { Loading } from "./commons/Loading"
import { ItemCard } from "./ItemCard"

export function Address() {
  const { address } = useParams<{ address: string }>()

  const nftStore = useStore(NftStore)
  const [loading, setLoading] = useState(true)

  const itemsOfOwner = useObservable(nftStore.nftsOf(address))
  const collections = useMemo(() => set(itemsOfOwner?.map((i) => i.collection) ?? []), [itemsOfOwner])

  useEffect(() => {
    setLoading(true)
    nftStore.fetchNftsOfOwner(address).then(() => {
      setLoading(false)
    })
  }, [address, nftStore])

  useEffect(() => {
    collections.map((c) => nftStore.fetchCollectionInfo(c))
  }, [collections, nftStore])

  console.log("items of owner", itemsOfOwner)

  return <Container>
    <Grid
      container
      spacing={6}
      direction="row"
      justifyContent="center"
      alignItems="center"
    >
      { itemsOfOwner && itemsOfOwner.slice(0, 25).map((item) => <Grid item xs>
        <ItemCard key={`item${item}`} collection={item.collection} id={item.id} />
      </Grid>)}
    </Grid>
    <Loading loading={loading} />
  </Container>
}
