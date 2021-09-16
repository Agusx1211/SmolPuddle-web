import { Container, Grid, makeStyles, Typography } from "@material-ui/core"
import { useEffect, useState } from "react"
import { useParams } from "react-router"
import { Link } from "react-router-dom"
import { useObservable, useStore } from "../stores"
import { NftStore } from "../stores/NftStore"
import Skeleton from '@material-ui/lab/Skeleton'
import { CancelButton } from "./buttons/CancelButton"
import { SellButton } from "./buttons/SellButton"
import { BuyButton } from "./buttons/BuyButton"
import { OrderbookStore } from "../stores/OrderbookStore"
import { Warning } from "./buttons/Warning"
import { SendButton } from "./buttons/SendButton"
import { Order } from "../types/order"
import { Database } from "../stores/Database"

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
  },
  warn: {
    height: 36,
    marginLeft: theme.spacing(1)
  }
}))

export function View() {
  const classes = useStyles()

  const { collection, id } = useParams<{ collection: string, id: string }>()

  const nftStore = useStore(NftStore)
  const orderbookStore = useStore(OrderbookStore)
  const database = useStore(Database)

  const metadata = useObservable(nftStore.metadataOfItem(collection, id))
  const itemOwner = useObservable(nftStore.ownerOf(collection, id))
  const lastUpdate = useObservable(database.lastUpdatedOrders)

  const [listing, setListing] = useState<Order | undefined>(undefined)

  const itemMetadata = metadata?.item
  const name = itemMetadata?.name ?? (metadata !== undefined ? `${metadata?.collection?.name ?? '...'} #${id.toString()}` : undefined)

  useEffect(() => {
    database.getOrderForItem(collection, id).then((order) => {
      setListing(order)
    })
  }, [collection, id, lastUpdate])

  useEffect(() => {
    nftStore.fetchItemInfo(collection, id)
    nftStore.fetchCollectionInfo(collection)
    nftStore.fetchOwnerInfo(collection, id)
    if (listing) orderbookStore.refreshStatus(listing)
  }, [nftStore, collection, id, listing])

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
          spacing = {2}
        >
          <Grid item>
            <CancelButton order={listing} variant="contained" />
          </Grid>
          <Grid item>
            <SellButton collection={collection} id={id} variant="contained" />
          </Grid>
          <Grid item>
            <SendButton collection={collection} id={id} variant="contained" />
          </Grid>
          <Grid item>
            <BuyButton order={listing} variant="contained" />
          </Grid>
          <Grid item>
            <Warning className={classes.warn} collection={collection} />
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  </Container>
}
