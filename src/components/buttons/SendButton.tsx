import { Button } from "@material-ui/core"
import { ethers } from "ethers"
import { useEffect, useState } from "react"
import { useObservable, useStore } from "../../stores"
import { CreateTransferStore } from "../../stores/CreateTransferStore"
import { NftStore } from "../../stores/NftStore"
import { Web3Store } from "../../stores/Web3Store"
import { Address } from "../../types/address"

export function SendButton(props: { collection: Address, id: ethers.BigNumberish, variant: 'text' | 'outlined' | 'contained' | undefined }) {
  const { collection, id, variant } = props

  const web3Store = useStore(Web3Store)
  const nftStore = useStore(NftStore)

  const account = useObservable(web3Store.account)
  const createTransferStore = useStore(CreateTransferStore)
  const itemOwner = useObservable(nftStore.ownerOf(collection, id))
  const [isOwner, setIsOwner] = useState(account !== undefined && account === itemOwner)

  useEffect(() => {
    setIsOwner(account !== undefined && account === itemOwner)
  }, [account, itemOwner])

  return <>
  { (isOwner) && <Button variant={variant} disableElevation color="primary" onClick={() => createTransferStore.openCreateTransfer({ collection, id })}>
    Send
  </Button> }
  </>
}
