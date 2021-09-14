import { Box, Container } from "@material-ui/core"
import { useEffect, useMemo } from "react"
import { useParams } from "react-router"
import { Link } from "react-router-dom"
import { useObservable, useStore } from "../stores"
import { CollectionsStore } from "../stores/CollectionsStore"
import { NftStore } from "../stores/NftStore"
import { fuzzyEq } from "../utils"

export function CollectionResult(props: { collection: string }) {
  const { collection } = props
  const nftStore = useStore(NftStore)
  const metadata = useObservable(nftStore.metadataOfCollection(collection))

  return <Box flexDirection='row'>
    <Link to={`/${collection}`}>
      {metadata?.name} ({metadata?.symbol})
    </Link>
    <Box>Address: {collection}</Box>
  </Box>
}

export function Search() {
  const { search } = useParams<{ search: string }>()

  const collectionsStore = useStore(CollectionsStore)
  const nftStore = useStore(NftStore)

  const knownCollections = useObservable(collectionsStore.knownCollections)
  const collectionsInfo = useObservable(nftStore.collectionMetadatas)

  const matchingCollectionInfo = useMemo(() => {
    return Object.keys(collectionsInfo).filter((k) => {
      const val = collectionsInfo[k]
      return (
        fuzzyEq(search, val?.name) ||
        fuzzyEq(search, val?.symbol)
      )
    })
  }, [search, collectionsInfo])

  const resultCollections = matchingCollectionInfo

  useEffect(() => {
    knownCollections.forEach((c) => nftStore.fetchCollectionInfo(c))
  }, [nftStore, knownCollections])

  return <Container>
    { resultCollections.map((c) => <CollectionResult key={`${c}-c`} collection={c}/>)}
  </Container>
}
