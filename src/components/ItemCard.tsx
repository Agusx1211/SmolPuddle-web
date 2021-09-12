import { Button, Card, CardActionArea, CardActions, CardContent, CardMedia, makeStyles, Typography } from "@material-ui/core"
import { ethers } from "ethers"
import { useEffect } from "react"
import { useHistory } from "react-router"
import { useObservable, useStore } from "../stores"
import { CreateOrderStore } from "../stores/CreateOrderStore"
import { NftStore } from "../stores/NftStore"
import { OrderbookStore } from "../stores/OrderbookStore"
import { Web3Store } from "../stores/Web3Store"
import { Address } from "../types/address"
import Skeleton from '@material-ui/lab/Skeleton'
import { CancelButton } from "./buttons/CancelButton"
import { BuyButton } from "./buttons/BuyButton"

const useStyles = makeStyles((theme) => ({
  root: {
    width: 345,
    height: 600,
  },
  media: {
    height: 340
  },
  content: {
    height: 'auto'
  },
  actions: {
    margin: theme.spacing(1)
  }
}))

export function ItemCard(props: { collection: Address, id: ethers.BigNumberish }) {
  const classes = useStyles()

  const { collection, id } = props

  const history = useHistory()
  const nftStore = useStore(NftStore)
  const createOrderStore = useStore(CreateOrderStore)
  const web3Store = useStore(Web3Store)
  const orderbookStore = useStore(OrderbookStore)

  const account = useObservable(web3Store.account)
  const metadata = useObservable(nftStore.metadataOfItem(collection, id))
  const itemOwner = useObservable(nftStore.ownerOf(collection, id))
  const listing = useObservable(orderbookStore.listingFor(collection, id))

  const isOwner = account !== undefined && account === itemOwner || true

  const itemMetadata = metadata?.item
  const name = itemMetadata ? itemMetadata?.name ?? 'Not found' : 'Loading ...'

  useEffect(() => {
    nftStore.fetchItemInfo(collection, id)
  }, [nftStore, collection, id])

  return <Card className={classes.root}>
    <CardActionArea>
      { itemMetadata && <CardMedia
        className={classes.media}
        image={itemMetadata.image ?? '/not-found.png'}
        title={name}
      /> }
      { !itemMetadata && <Skeleton
        variant="rect"
        className={classes.media}
      /> }
      <CardContent>
        <Typography gutterBottom variant="h5" component="h2" align="left">
          { itemMetadata && name } { !itemMetadata && <Skeleton />}
        </Typography>
        { itemMetadata && <Typography variant="body2" color="textSecondary" component="p" align="left">
          {itemMetadata?.description ? `${itemMetadata.description.slice(0, 100)}...` : 'Metadata not found'}
        </Typography> }
        { !itemMetadata && <Skeleton variant="rect" height={125} />}
      </CardContent>
    </CardActionArea>
    <CardActions className={classes.actions}>
      {/** TODO: Only sell if owner */}
      <CancelButton order={listing?.order} variant="text" />
      { isOwner && <Button size="small" color="primary" onClick={() => createOrderStore.openCreateOrder({ collection, id })}>
        Sell
      </Button> }
      <BuyButton order={listing?.order} variant="contained" />
      <Button size="small" color="primary" onClick={() => history.push(`/${collection}/${ethers.BigNumber.from(id).toString()}`)}>
        View
      </Button>
    </CardActions>
  </Card>
}
