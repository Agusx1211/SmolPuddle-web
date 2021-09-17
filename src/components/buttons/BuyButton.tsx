import { Button, Tooltip } from "@material-ui/core";
import { ethers } from "ethers";
import { useMemo, useState } from "react";
import { SmolPuddleAbi } from "../../abi/SmolPuddle";
import { SmolPuddleContract } from "../../constants";
import { useObservable, useStore } from "../../stores";
import { OrderbookStore } from "../../stores/OrderbookStore";
import { Web3Store } from "../../stores/Web3Store";
import { Order, orderAbiEncode } from "../../types/order";
import { buildTxNotif, NotificationsStore } from '../../stores/NotificationsStore';
import { NftStore } from "../../stores/NftStore";
import { safe } from "../../utils";

const HARDCODED_CREATION = ethers.BigNumber.from("18446744073709551615")

export function BuyButton(props: { order?: Order, variant: 'text' | 'outlined' | 'contained' | undefined }) {
  const { order, variant } = props

  const web3Store = useStore(Web3Store)
  const nftStore = useStore(NftStore)
  const orderbookStore = useStore(OrderbookStore)
  const notificationsStore = useStore(NotificationsStore)

  const [pending, setPending] = useState(false)

  const account = useObservable(web3Store.account)

  const listingDate = useMemo(() => {
    if (!order) return undefined
    const expiration = safe(() => ethers.BigNumber.from(order.expiration))
    return expiration?.sub(HARDCODED_CREATION).toNumber()
  }, [order])

  const buy = async () => {
    if (!order) return console.warn("no order found")

    const signer = web3Store.injected.get()?.getSigner()
    if (signer === undefined) {
      web3Store.connect().then(() => buy())
      return
    }

    const isRightChain = web3Store.rightChain.get()
    if (!isRightChain) {
      notificationsStore.notify({ severity: 'error', content: 'Invalid network' })
      return
    }

    const contract = new ethers.Contract(SmolPuddleContract, SmolPuddleAbi).connect(signer)

    contract.swap(orderAbiEncode(order), ethers.utils.arrayify(order.signature), { value: ethers.BigNumber.from(order.ask.amountOrId) }).then((tx: ethers.providers.TransactionResponse) => {
      setPending(true)
      notificationsStore.notify(buildTxNotif(tx))
      tx.wait().then(() => {
        orderbookStore.refreshStatus(order).then(() => {
          setPending(false)
          nftStore.fetchOwnerInfo(order.sell.token, order.sell.amountOrId, true)
        })
      }).catch(notificationsStore.catchAndNotify)
    }).catch(notificationsStore.catchAndNotify)
  }

  return <>
  { (order && order.seller !== account) && <Tooltip title={`Order created at ${listingDate ? new Date(listingDate).toLocaleString() : 'Unknown'}`}>
      <Button variant={variant} disabled={pending} disableElevation color="primary" onClick={buy}>
        { pending ? 'Buying...' : 'Buy' } - {ethers.utils.formatEther(order.ask.amountOrId)} ETH
      </Button>
    </Tooltip>
  }
  </>
}
