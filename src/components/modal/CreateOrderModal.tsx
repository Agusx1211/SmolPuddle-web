import { Backdrop, Button, Fade, InputAdornment, makeStyles, Modal, TextField } from "@material-ui/core";
import { ethers } from "ethers";
import { useObservable, useStore } from "../../stores";
import { CreateOrderStore } from "../../stores/CreateOrderStore";
import { NftStore } from "../../stores/NftStore";
import clsx from 'clsx'
import { Web3Store } from "../../stores/Web3Store";
import { attachSignature, Currency, newOrder, Order } from "../../types/order";

export function isSupportedOrder(order: Order): boolean {
  return (
    order.currency === Currency.Ask &&
    order.ask.token === DefaultAskCurrency
  )
}

const useStyles = makeStyles((theme) => ({
  modal: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paper: {
    backgroundColor: theme.palette.background.paper,
    boxShadow: theme.shadows[5],
    padding: theme.spacing(2, 4, 3),
  },
  margin: {
    margin: theme.spacing(1),
  },
  buttons: {
    '& > *': {
      margin: theme.spacing(1),
    },
  },
  textField: {
    width: '25ch',
  }
}))

export const DefaultAskCurrency = "0xWETH"

export function CreateOrderModalContent(props: { collection: string, id: ethers.BigNumberish }) {
  const { collection, id } = props

  const classes = useStyles()
  const nftStore = useStore(NftStore)
  const createOrderStore = useStore(CreateOrderStore)
  const web3Store = useStore(Web3Store)

  const itemMetata = useObservable(nftStore.metadataOfItem(collection, id))

  const handleCreateOrder = async () => {
    // Connect to chain
    const injected = web3Store.injected.get()
    if (!injected) {
      web3Store.connect()
      return
    }

    const seller = web3Store.account.get()
    if (!seller || ethers.utils.isAddress(seller)) {
      return console.error('invalid address', seller)
    }


    // Build order
    const salt = ethers.utils.hexlify(ethers.utils.randomBytes(32))
    const order = newOrder({
      salt,
      seller,
      ask: {
        token: DefaultAskCurrency,
        amountOrId: ethers.utils.parseEther('1')
      },
      sell: {
        token: collection,
        amountOrId: ethers.BigNumber.from(id)
      },
      currency: Currency.Ask,
      fees: [],
      expiration: ethers.BigNumber.from("18446744073709551615"), // never
    })

    // Sign order
    // TODO: Should add more info to sign, contract addr, chainId and some string
    const signature = await injected.getSigner().signMessage(order.hash)
    const signedOrder = attachSignature(order, signature)

  }

  return <div className={classes.paper}>
    <h2 id="transition-modal-title">Selling {itemMetata?.collection.name} - {itemMetata?.item?.name}</h2>
    <TextField
      label="Price"
      id="standard-start-adornment"
      className={clsx(classes.margin, classes.textField)}
      InputProps={{
        startAdornment: <InputAdornment position="start">ETH</InputAdornment>,
      }}
    />
    <div className={classes.buttons}>
      <Button color="primary" onClick={handleCreateOrder}>Create order</Button>
      <Button onClick={() => createOrderStore.closeCreateOrder()}>
        Cancel
      </Button>
    </div>
  </div>
}

export function CreateOrderModal() {
  const classes = useStyles()

  const createOrderStore = useStore(CreateOrderStore)

  const open = useObservable(createOrderStore.formOpened)
  const target = useObservable(createOrderStore.target)

  return <Modal
    aria-labelledby="transition-modal-title"
    aria-describedby="transition-modal-description"
    className={classes.modal}
    closeAfterTransition
    BackdropComponent={Backdrop}
    open={open}
    onClose={() => createOrderStore.closeCreateOrder()}
    BackdropProps={{
      timeout: 500,
    }}
  >
    { target ? <Fade in={open}>
      <CreateOrderModalContent collection={target.collection} id={target.id} />
    </Fade> : <div>Error sell target not found</div> }
  </Modal>
}
