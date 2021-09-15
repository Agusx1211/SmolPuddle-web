import { Backdrop, Button, Fade, InputAdornment, makeStyles, Modal, TextField } from "@material-ui/core"
import { ethers } from "ethers"
import { useObservable, useStore } from "../../stores"
import { CreateOrderStore } from "../../stores/CreateOrderStore"
import { NftStore } from "../../stores/NftStore"
import clsx from 'clsx'
import { Web3Store } from "../../stores/Web3Store"
import { attachSignature, Currency, newOrder, Order } from "../../types/order"
import { OrderbookStore } from "../../stores/OrderbookStore"
import { useEffect, useState } from "react"
import { parseError, safe } from "../../utils"
import { ERC721Abi } from "../../abi/ERC721"
import { SmolPuddleContract } from "../../constants"
import { buildTxNotif, NotificationsStore } from '../../stores/NotificationsStore'

export function isSupportedOrder(order: Order): boolean {
  return (
    order.currency === Currency.SellNFT &&
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

export const DefaultAskCurrency = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"

export function CreateOrderModalContent(props: { collection: string, id: ethers.BigNumberish }) {
  const { collection, id } = props

  const classes = useStyles()
  const nftStore = useStore(NftStore)
  const createOrderStore = useStore(CreateOrderStore)
  const web3Store = useStore(Web3Store)
  const orderBookStore = useStore(OrderbookStore)
  const notificationsStore = useStore(NotificationsStore)

  const provider = useObservable(web3Store.provider)
  const account = useObservable(web3Store.account)

  const itemMetata = useObservable(nftStore.metadataOfItem(collection, id))
  const [amount, setAmount] = useState("")
  const [isApproved, setIsApproved] = useState<boolean | undefined>(undefined)
  const [update, setUpdate] = useState(0)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    setIsApproved(undefined)
    const contract = new ethers.Contract(collection, ERC721Abi).connect(provider)

    if (account) {
      contract.isApprovedForAll(account, SmolPuddleContract).then((isApproved: boolean) => {
        setIsApproved(isApproved)
      }).catch(notificationsStore.catchAndNotify)
    }
  }, [provider, collection, account, update, notificationsStore.catchAndNotify])

  const handleCreateOrder = async () => {
    try {
      // Connect to chain
      const injected = web3Store.injected.get()
      if (!injected) {
        web3Store.connect()
        return
      }

      const seller = safe(() => web3Store.account.get())
      if (!seller) {
        return console.error('invalid address', seller)
      }

      if (!isApproved) {
        const contract = new ethers.Contract(collection, ERC721Abi).connect(injected.getSigner())
        contract.setApprovalForAll(SmolPuddleContract, true).then((tx: ethers.providers.TransactionResponse) => {
          setPending(true)
          notificationsStore.notify(buildTxNotif(tx))
          tx.wait().then(() => {
            setPending(false)
            setUpdate(update + 1)
          }).catch(notificationsStore.catchAndNotify)
        }).catch(notificationsStore.catchAndNotify)
        return
      }

      const ethAmount = safe(() => ethers.utils.parseEther(amount))
      if (!ethAmount || ethAmount.lte(0)) {
        return notificationsStore.notify({ content: `Invalid amount ${amount}`, severity: 'warning' })
      }

      // Build order
      const salt = ethers.utils.hexlify(ethers.utils.zeroPad(ethers.utils.randomBytes(8), 32))
      const order = newOrder({
        salt,
        seller,
        ask: {
          token: DefaultAskCurrency,
          amountOrId: ethAmount
        },
        sell: {
          token: collection,
          amountOrId: ethers.BigNumber.from(id)
        },
        currency: Currency.SellNFT,
        fees: [],
        expiration: ethers.BigNumber.from("18446744073709551615").add(Date.now()), // Adding now time so we can sort recent listing
      })

      // Sign order
      let signature = `${await injected.getSigner().signMessage(ethers.utils.arrayify(order.hash))}02`
      const sigVersion = signature.slice(130,132)
      if (sigVersion !== '1b' && sigVersion !== '1c') {
        const newVersion = parseInt(sigVersion) + 27
        signature = signature.slice(0,130) + newVersion.toString(16) + signature.slice(132,134)
      } 
      const signedOrder = attachSignature(order, signature)

      // Broadcast order
      orderBookStore.addOrder(signedOrder, true)

      // Notificate and close window
      notificationsStore.notify({
        content: `Created order for ${itemMetata?.collection?.name} ${itemMetata?.item?.name}`,
        severity: 'success'
      })

      createOrderStore.closeCreateOrder()
    } catch (e) {
      console.warn(e)

      notificationsStore.notify({
        content: parseError(e),
        severity: 'warning'
      })
    }
  }

  useEffect(() => {
    setAmount("")
    setPending(false)
  }, [collection, id])

  return <div className={classes.paper}>
    <h2 id="transition-modal-title">Selling {itemMetata?.collection.name} - {itemMetata?.item?.name}</h2>
    <TextField
      label="Price"
      id="standard-start-adornment"
      className={clsx(classes.margin, classes.textField)}
      InputProps={{
        startAdornment: <InputAdornment position="start">ETH</InputAdornment>,
      }}
      value={amount}
      onChange={(e) => setAmount(e.target.value)}
    />
    <div className={classes.buttons}>
      <Button color="primary" disabled={pending} onClick={handleCreateOrder}>
        { isApproved === undefined ? '...' : isApproved ? 'Create order' : 'Approve contract' }
      </Button>
      <Button onClick={() => createOrderStore.closeCreateOrder()}>
        Cancel
      </Button>
    </div>
  </div>
}

export function isValidSignature(order: Order) {
  const sigV = order.signature.slice(130,132)
  if (sigV != '1b' && sigV != '1c') {
    return false
  }

  const signer = ethers.utils.verifyMessage(ethers.utils.arrayify(order.hash), order.signature.slice(0,132));
  return signer === order.seller ? true : false
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
