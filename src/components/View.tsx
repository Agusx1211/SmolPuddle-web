
import { Container, Grid, makeStyles, Typography } from "@material-ui/core"
import { useEffect } from "react"
import { useParams } from "react-router"
import { useObservable, useStore } from "../stores"
import { NftStore } from "../stores/NftStore"

const useStyles = makeStyles((theme) => ({
  nftTitle: {
    margin: theme.spacing(2)
  },
  nftDescription: {
    margin: theme.spacing(2)
  },
  nftImage: {
    width: '100%',
    margin: theme.spacing(2)
  }
}))

export function View() {
  const classes = useStyles()

  const { collection, id } = useParams<{ collection: string, id: string }>()

  const nftStore = useStore(NftStore)
  const itemMetata = useObservable(nftStore.metadataOfItem(collection, id))

  useEffect(() => {
    nftStore.fetchItemInfo(collection, id)
    nftStore.fetchCollectionInfo(collection)
  }, [nftStore, collection, id])

  console.log(itemMetata)

  return <Container>
    <Grid
      container
      direction="row"
      justifyContent="flex-start"
      alignItems="flex-start"
      spacing={1}
    >
      <Grid container item xs>
        <img className={classes.nftImage}  src={itemMetata?.item?.image} alt={itemMetata?.item?.name}></img>
        <Typography color="textSecondary">
          Collection: {itemMetata?.collection?.name} ({itemMetata?.collection?.symbol})
        </Typography>
      </Grid>
      <Grid container item xs>
        <Typography className={classes.nftTitle} variant="h4" color="textSecondary" align="left">
          {itemMetata?.item?.name}
        </Typography>
        <Typography className={classes.nftDescription} variant="h6" color="textSecondary" align="left">
          {itemMetata?.item?.description}
        </Typography>
      </Grid>
    </Grid>
  </Container>
}
