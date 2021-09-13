import { Button } from "@material-ui/core";
import { ethers } from "ethers";
import { useState } from "react";
import { SmolPuddleAbi } from "../../abi/SmolPuddle";
import { SmolPuddleContract } from "../../constants";
import { useObservable, useStore } from "../../stores";
import { OrderbookStore } from "../../stores/OrderbookStore";
import { Web3Store } from "../../stores/Web3Store";
import { Order, orderAbiEncode } from "../../types/order";
import { buildTxNotif, NotificationsStore } from '../../stores/NotificationsStore';

export function BuyButton(props: { order?: Order, variant: 'text' | 'outlined' | 'contained' | undefined }) {
  const { order, variant } = props

  const web3Store = useStore(Web3Store)
  const orderbookStore = useStore(OrderbookStore)
  const notificationsStore = useStore(NotificationsStore)

  const [pending, setPending] = useState(false)

  const account = useObservable(web3Store.account)

  const buy = () => {
    if (!order) return console.warn("no order found")

    const signer = web3Store.injected.get()?.getSigner()
    if (signer === undefined) {
      web3Store.connect().then(() => buy())
      return
    }

    const contract = new ethers.Contract(SmolPuddleContract, SmolPuddleAbi).connect(signer)
    contract.swap(orderAbiEncode(order), order.signature, { value: ethers.BigNumber.from(order.ask.amountOrId).toString() }).then((tx: ethers.providers.TransactionResponse) => {
      setPending(true)
      notificationsStore.notify(buildTxNotif(tx))
      tx.wait().then(() => {
        orderbookStore.refreshStatus(order).then(() => {
          setPending(false)
        })
      }).catch(notificationsStore.catchAndNotify)
    }).catch(notificationsStore.catchAndNotify)
  }

  return <>
  { (order && order.seller !== account) && <Button variant={variant} disabled={pending} disableElevation color="primary" onClick={buy}>
    { pending ? 'Buying...' : 'Buy' } - {ethers.utils.formatEther(order.ask.amountOrId)} ETH
  </Button> }
  </>
}
