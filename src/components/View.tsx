import { Container, Grid, makeStyles, Typography } from "@material-ui/core"
import { useEffect } from "react"
import { useParams } from "react-router"
import { Link } from "react-router-dom"
import { useObservable, useStore } from "../stores"
import { NftStore } from "../stores/NftStore"
import Skeleton from '@material-ui/lab/Skeleton'
import { CancelButton } from "./buttons/CancelButton"
import { SellButton } from "./buttons/SellButton"
import { BuyButton } from "./buttons/BuyButton"
import { OrderbookStore } from "../stores/OrderbookStore"

const useStyles = makeStyles((theme) => ({
  nftTitle: {
    margin: theme.spacing(2)
  },
  nftDescription: {
    margin: theme.spacing(2)
  },
  nftImage: {
    width: '100%',
    height: 'auto',
    margin: theme.spacing(2)
  }
}))

export function View() {
  const classes = useStyles()

  const { collection, id } = useParams<{ collection: string, id: string }>()

  const nftStore = useStore(NftStore)
  const orderbookStore = useStore(OrderbookStore)

  const metadata = useObservable(nftStore.metadataOfItem(collection, id))
  const itemOwner = useObservable(nftStore.ownerOf(collection, id))
  const listing = useObservable(orderbookStore.listingFor(collection, id))

  const itemMetadata = metadata?.item
  const name = itemMetadata?.name ?? (metadata !== undefined ? `${metadata?.collection?.name ?? '...'} #${id.toString()}` : undefined)

  useEffect(() => {
    nftStore.fetchItemInfo(collection, id)
    nftStore.fetchCollectionInfo(collection)
    nftStore.fetchOwnerInfo(collection, id)
  }, [nftStore, collection, id])

  const collectionName = metadata?.collection ? `${metadata?.collection?.name} (${metadata?.collection?.symbol})`: collection

  return <Container>
    <Grid
      container
      direction="row"
      justifyContent="flex-start"
      alignItems="flex-start"
      spacing={1}
    >
      <Grid container item md>
      { !(itemMetadata?.image) && <Skeleton className={classes.nftImage} variant="rect" height={700}/> }
        { itemMetadata?.image && <img className={classes.nftImage} src={itemMetadata.image} alt={itemMetadata.name}></img> }
      </Grid>
      <Grid container item md>
        <Typography className={classes.nftTitle} variant="h4" color="textSecondary" align="left">
          { name ? name : <Skeleton width={400} />}
        </Typography>
        <Typography className={classes.nftDescription} color="textSecondary" align="left">
          {itemMetadata ? itemMetadata.description : <Skeleton variant="rect" height={300} width={600} />}
        </Typography>
        <Typography className={classes.nftDescription} color="textSecondary" align="left">
          Owner: { itemOwner ? <Link to={`/address/${itemOwner}`}>{itemOwner}</Link> : <Skeleton width={400} /> }
        </Typography>
        <Typography className={classes.nftDescription}  color="textSecondary">
          Collection: <Link to={`/${collection}`}>{collectionName}</Link>
        </Typography>
        <Grid
          className={classes.nftDescription}
          container
          direction="row"
          justifyContent="flex-start"
        >
          <Grid item>
            <CancelButton order={listing?.order} variant="contained" />
          </Grid>
          <Grid item>
            <SellButton collection={collection} id={id} variant="contained" />
          </Grid>
          <Grid item>
            <BuyButton order={listing?.order} variant="contained" />
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  </Container>
}
