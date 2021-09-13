import { Container, Grid } from "@material-ui/core"
import { useEffect, useMemo, useState } from "react"
import { useParams } from "react-router"
import { useObservable, useStore } from "../stores"
import { NftStore } from "../stores/NftStore"
import { set } from "../utils"
import { Loading } from "./commons/Loading"
import { Page, Paginator } from "./commons/Paginator"
import { ItemCard } from "./ItemCard"

export function Address() {
  const { address } = useParams<{ address: string }>()

  const nftStore = useStore(NftStore)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState<Page>()

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

  const sliced = useMemo(() => itemsOfOwner?.slice(page?.start, page?.end) ?? [], [page, itemsOfOwner])

  return <Container>
    <Grid
      container
      spacing={6}
      direction="row"
      justifyContent="center"
      alignItems="center"
    >
      { sliced && sliced.map((item) => <Grid item xs>
        <ItemCard key={`item${item}`} collection={item.collection} id={item.id} />
      </Grid>)}
    </Grid>
    <Loading loading={loading} />
    <Paginator total={itemsOfOwner?.length ?? 0} onPage={setPage} />
  </Container>
}
