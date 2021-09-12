import React from 'react'
import { Button } from "@material-ui/core"
import { ethers } from "ethers"
import { useObservable, useStore } from "../../stores"
import { CreateOrderStore } from "../../stores/CreateOrderStore"
import { NftStore } from "../../stores/NftStore"
import { OrderbookStore } from "../../stores/OrderbookStore"
import { Web3Store } from "../../stores/Web3Store"
import { Address } from "../../types/address"

export function SellButton(props: { collection: Address, id: ethers.BigNumberish, variant: 'text' | 'outlined' | 'contained' | undefined }) {
  const { collection, id, variant } = props

  const web3Store = useStore(Web3Store)
  const orderbookStore = useStore(OrderbookStore)
  const nftStore = useStore(NftStore)

  const listing = useObservable(orderbookStore.listingFor(collection, id))

  const account = useObservable(web3Store.account)
  const createOrderStore = useStore(CreateOrderStore)
  const itemOwner = useObservable(nftStore.ownerOf(collection, id))

  const isOwner = account !== undefined && account === itemOwner

  return <>
  { (isOwner && !listing) && <Button variant={variant} size="small" color="primary" onClick={() => createOrderStore.openCreateOrder({ collection, id })}>
    Sell
  </Button> }
  </>
}
