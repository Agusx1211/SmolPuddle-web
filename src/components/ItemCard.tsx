import { Button, Card, CardActionArea, CardActions, CardContent, CardMedia, makeStyles, Typography } from "@material-ui/core"
import { ethers } from "ethers"
import { useEffect } from "react"
import { useHistory } from "react-router"
import { useObservable, useStore } from "../stores"
import { CreateOrderStore } from "../stores/CreateOrderStore"
import { NftStore } from "../stores/NftStore"
import { Address } from "../types/address"

const useStyles = makeStyles({
  root: {
    width: 345
  },
  media: {
    height: 350,
  },
})

export function ItemCard(props: { collection: Address, id: ethers.BigNumberish }) {
  const classes = useStyles()

  const { collection, id } = props

  const history = useHistory()
  const nftStore = useStore(NftStore)
  const createOrderStore = useStore(CreateOrderStore)
  const itemMetata = useObservable(nftStore.metadataOfItem(collection, id))

  useEffect(() => {
    nftStore.fetchItemInfo(collection, id)
  }, [nftStore, collection, id])

  return <Card className={classes.root}>
    <CardActionArea>
      <CardMedia
        className={classes.media}
        image={itemMetata?.item?.image}
        title="Contemplative Reptile"
      />
      <CardContent>
        <Typography gutterBottom variant="h5" component="h2" align="left">
          {itemMetata?.item?.name}
        </Typography>
        <Typography variant="body2" color="textSecondary" component="p" align="left">
          {`${itemMetata?.item?.description?.slice(0, 100)}...`}
        </Typography>
      </CardContent>
    </CardActionArea>
    <CardActions>
      {/** TODO: Only sell if owner */}
      <Button size="small" color="primary" onClick={() => createOrderStore.openCreateOrder({ collection, id })}>
        Sell
      </Button>
      <Button size="small" color="primary" onClick={() => history.push(`/${collection}/${id.toString()}`)}>
        View
      </Button>
    </CardActions>
  </Card>
}
