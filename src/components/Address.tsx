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

  useEffect(() => {
    setLoading(true)
    nftStore.fetchNftsOfOwner(address).then(() => {
      setLoading(false)
    })
  }, [address, nftStore])

  const sliced = useMemo(() => itemsOfOwner?.slice(page?.start ?? 0, page?.end ?? 25) ?? [], [page, itemsOfOwner])

  useEffect(() => {
    const difCollections = set(sliced.map((c) => c.collection))
    difCollections.map((c) => nftStore.fetchCollectionInfo(c))
  }, [sliced, nftStore])

  return <Container>
    <Grid
      container
      spacing={6}
      direction="row"
      justifyContent="center"
      alignItems="center"
    >
      { (!loading && sliced.length === 0) && <div>This address has no NFTs :(</div>}
      { sliced && sliced.map((item) => <Grid key={`item-${item.collection}-${item.id}`} item xs={11} md={4}>
        <ItemCard collection={item.collection} id={item.id} />
      </Grid>)}
    </Grid>
    <Loading loading={loading} />
    <Paginator total={itemsOfOwner?.length ?? 0} onPage={setPage} />
  </Container>
}
