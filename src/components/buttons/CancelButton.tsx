import React from 'react'
import { Button } from "@material-ui/core";
import { ethers } from "ethers";
import { useState } from "react";
import { SmolPuddleAbi } from "../../abi/SmolPuddle";
import { SmolPuddleContract } from "../../constants";
import { useObservable, useStore } from "../../stores";
import { OrderbookStore } from "../../stores/OrderbookStore";
import { Web3Store } from "../../stores/Web3Store";
import { Order } from "../../types/order";
import { buildTxNotif, NotificationsStore } from '../../stores/NotificationsStore';

export function CancelButton(props: { order?: Order, variant: 'text' | 'outlined' | 'contained' | undefined }) {
  const { order, variant } = props

  const web3Store = useStore(Web3Store)
  const orderbookStore = useStore(OrderbookStore)
  const notificationsStore = useStore(NotificationsStore)

  const [pending, setPending] = useState(false)

  const account = useObservable(web3Store.account)

  const cancel = () => {
    if (!order) return console.warn("no order found")

    const signer = web3Store.injected.get()?.getSigner()
    if (signer === undefined) return console.warn("signer not found")

    const contract = new ethers.Contract(SmolPuddleContract, SmolPuddleAbi).connect(signer)
    contract.cancel(order.hash).then((tx: ethers.providers.TransactionResponse) => {
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
  { (order && account && order.seller === account) && <Button variant={variant} disabled={pending} disableElevation color="primary" onClick={cancel}>
    { pending ? 'Canceling...' : 'Cancel' } - {ethers.utils.formatEther(order.ask.amountOrId)} ETH
  </Button> }
  </>
}
