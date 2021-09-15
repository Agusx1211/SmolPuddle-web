import { Backdrop, Button, Fade, InputAdornment, makeStyles, Modal, TextField } from "@material-ui/core"
import { ethers } from "ethers"
import { useObservable, useStore } from "../../stores"
import { NftStore } from "../../stores/NftStore"
import clsx from 'clsx'
import { Web3Store } from "../../stores/Web3Store"
import { useEffect, useState } from "react"
import { parseError, safe } from "../../utils"
import { ERC721Abi } from "../../abi/ERC721"
import { buildTxNotif, NotificationsStore } from '../../stores/NotificationsStore'
import { CreateTransferStore } from "../../stores/CreateTransferStore"

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
    width: '48ch',
  }
}))

export function CreateTransferModalContent(props: { collection: string, id: ethers.BigNumberish }) {
  const { collection, id } = props

  const classes = useStyles()
  const nftStore = useStore(NftStore)
  const web3Store = useStore(Web3Store)
  const notificationsStore = useStore(NotificationsStore)
  const createTransferStore = useStore(CreateTransferStore)

  const itemMetata = useObservable(nftStore.metadataOfItem(collection, id))
  const [recipient, setRecipient] = useState("")
  const [update, setUpdate] = useState(0)
  const [pending, setPending] = useState(false)

  const handleCreateTransfer = async () => {
    try {
      // Connect to chain
      const injected = web3Store.injected.get()
      if (!injected) {
        web3Store.connect()
        return
      }

      const sender = safe(() => web3Store.account.get())
      if (!sender) {
        return console.error('invalid address', sender)
      }

      const contract = new ethers.Contract(collection, ERC721Abi).connect(injected.getSigner())
      contract.transferFrom(sender, recipient, id).then((tx: ethers.providers.TransactionResponse) => {
        setPending(true)
        notificationsStore.notify(buildTxNotif(tx))
        tx.wait().then(() => {
          setPending(false)
          setUpdate(update + 1)
        }).catch(notificationsStore.catchAndNotify)
      }).catch(notificationsStore.catchAndNotify)

      // Notificate and close window
      notificationsStore.notify({
        content: `${itemMetata?.collection.name} - ${itemMetata?.item?.name ?? `#${id}`} has been sent to ${recipient}!`,
        severity: 'success'
      })

      nftStore.ownerOf(collection, id)
      createTransferStore.closeCreateTransfer()

    } catch (e) {
      console.warn(e)
      notificationsStore.notify({
        content: parseError(e),
        severity: 'warning'
      })
    }
  }

  useEffect(() => {
    setRecipient(ethers.constants.AddressZero)
    setPending(false)
  }, [collection, id])

  return <div className={classes.paper}>
    <h2 id="transition-modal-title">Sending {`${itemMetata?.collection.name} - ${itemMetata?.item?.name ?? `#${id}`}`}</h2>
    <TextField
      label="Recipient Address"
      id="standard-start-adornment"
      className={clsx(classes.margin, classes.textField)}
      InputProps={{
        startAdornment: <InputAdornment position="start">To: </InputAdornment>,
      }}
      value={recipient}
      onChange={(e) => setRecipient(e.target.value)}
    />
    <div className={classes.buttons}>
      <Button color="primary" disabled={pending || recipient == ethers.constants.AddressZero } onClick={handleCreateTransfer}>
        { 'send' }
      </Button>
      <Button onClick={() => createTransferStore.closeCreateTransfer()}>
        Cancel
      </Button>
    </div>
  </div>
}

export function CreateTransferModal() {
  const classes = useStyles()
  const createTransferStore = useStore(CreateTransferStore)
  const open = useObservable(createTransferStore.formOpened)
  const target = useObservable(createTransferStore.target)

  return <Modal
    aria-labelledby="transition-modal-title"
    aria-describedby="transition-modal-description"
    className={classes.modal}
    closeAfterTransition
    BackdropComponent={Backdrop}
    open={open}
    onClose={() => createTransferStore.closeCreateTransfer()}
    BackdropProps={{
      timeout: 500,
    }}
  >
    { target ? <Fade in={open}>
      <CreateTransferModalContent collection={target.collection} id={target.id} />
    </Fade> : <div>Error transfer target not found</div> }
  </Modal>
}