import { Button, Card, CardActionArea, CardActions, CardContent, CardMedia, makeStyles, Typography } from "@material-ui/core"
import { ethers } from "ethers"
import { useEffect } from "react"
import { useHistory } from "react-router"
import { useObservable, useStore } from "../stores"
import { NftStore } from "../stores/NftStore"
import { OrderbookStore } from "../stores/OrderbookStore"
import { Address } from "../types/address"
import Skeleton from '@material-ui/lab/Skeleton'
import { CancelButton } from "./buttons/CancelButton"
import { BuyButton } from "./buttons/BuyButton"
import { SellButton } from "./buttons/SellButton"
import { Warning } from "./buttons/Warning"
import { SendButton } from "./buttons/SendButton"

const useStyles = makeStyles((theme) => ({
  root: {
    margin: 'auto',
    maxWidth: 345,
    height: 600,
    display: 'flex',
    flexDirection: 'column'
  },
  media: {
    height: 340,
    shapeRendering: 'optimizeSpeed',
    textRendering: 'optimizeSpeed',
    colorRendering: 'optimizeSpeed',
    backgroundPosition: 'top',
    backgroundSize: 'contain',
    backgroundColor: 'gainsboro'
  },
  content: {
    height: 'auto'
  },
  actions: {
    marginTop: 'auto',
    margin: theme.spacing(1)
  },
  warn: {
    marginLeft: 'auto!important',
    height: 36
  },
  title: {
    wordWrap: 'break-word',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical'
  }
}))

export function ItemCard(props: { collection: Address, id: ethers.BigNumberish }) {
  const classes = useStyles()

  const { collection, id } = props

  const history = useHistory()
  const nftStore = useStore(NftStore)
  const orderbookStore = useStore(OrderbookStore)

  const metadata = useObservable(nftStore.metadataOfItem(collection, id))
  const listing = useObservable(orderbookStore.listingFor(collection, id))

  const itemMetadata = metadata?.item
  const name = itemMetadata?.name ?? (metadata !== undefined ? `${metadata?.collection?.name ?? '...'} #${ethers.BigNumber.from(id).toString()}` : undefined)

  useEffect(() => {
    nftStore.fetchItemInfo(collection, id)
    nftStore.fetchOwnerInfo(collection, id)
  }, [nftStore, collection, id])

  const shortDescription = (description: string) => {
    const maxLen = 155
    if (description.length <= maxLen) return description
    return `${description.slice(0, maxLen - 3)}...`
  }
  
  const shortTitle = (title: string) => {
    const maxLen = 35
    if (title.length <= maxLen) return title
    return `${title.slice(0, maxLen - 3)}...`
  }

  return <Card className={classes.root}>
    <CardActionArea>
      { itemMetadata && <CardMedia
        className={classes.media}
        image={itemMetadata.image ?? '/not-found.png'}
        title={name}
        onClick={() => history.push(`/${collection}`)}
      /> }
      { !itemMetadata && <Skeleton
        variant="rect"
        className={classes.media}
      /> }
      <CardContent>
        <Typography className={classes.title} gutterBottom variant="h5" component="h2" align="left">
          { name && shortTitle(name) } { !name && <Skeleton /> }
        </Typography>
        { itemMetadata && <Typography variant="body2" color="textSecondary" component="p" align="left">
          {itemMetadata?.description ? shortDescription(itemMetadata.description) : 'Metadata not found'}
        </Typography> }
        { !itemMetadata && <Skeleton variant="rect" height={100} />}
      </CardContent>
    </CardActionArea>
    <CardActions className={classes.actions}>
      {/** TODO: Only sell if owner */}
      <CancelButton order={listing?.order} variant="text" />
      <SellButton collection={collection} id={id} variant="text" />
      <SendButton collection={collection} id={id} variant="text" />
      <BuyButton order={listing?.order} variant="contained" />
      <Button disableElevation color="primary" onClick={() => history.push(`/${collection}/${ethers.BigNumber.from(id).toString()}`)}>
        View
      </Button>
      <Warning className={classes.warn} collection={collection} />
    </CardActions>
  </Card>
}
