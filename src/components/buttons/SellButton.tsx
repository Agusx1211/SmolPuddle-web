import { useEffect, useState } from 'react'
import { Button } from "@material-ui/core"
import { ethers } from "ethers"
import { useObservable, useStore } from "../../stores"
import { CreateOrderStore } from "../../stores/CreateOrderStore"
import { NftStore } from "../../stores/NftStore"
import { Web3Store } from "../../stores/Web3Store"
import { Address } from "../../types/address"
import { Order } from '../../types/order'
import { Database } from '../../stores/Database'

export function SellButton(props: { collection: Address, id: ethers.BigNumberish, variant: 'text' | 'outlined' | 'contained' | undefined }) {
  const { collection, id, variant } = props

  const web3Store = useStore(Web3Store)
  const databaseStore = useStore(Database)
  const nftStore = useStore(NftStore)

  const [listing, setListing] = useState<Order | undefined>(undefined)

  const account = useObservable(web3Store.account)
  const createOrderStore = useStore(CreateOrderStore)
  const itemOwner = useObservable(nftStore.ownerOf(collection, id))
  const lastUpdate = useObservable(databaseStore.lastUpdatedOrders)

  const isOwner = account !== undefined && account === itemOwner

  useEffect(() => {
    databaseStore.getOrderForItem(collection, id).then(
      (order) => setListing(order)
    ).catch((e) => {
      console.error("sell button - error loading listing", collection, id, e)
    })
  }, [collection, id, lastUpdate])

  return <>
  { (isOwner && !listing) && <Button variant={variant} disableElevation color="primary" onClick={() => createOrderStore.openCreateOrder({ collection, id })}>
    Sell
  </Button> }
  </>
}
