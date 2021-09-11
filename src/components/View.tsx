import { useParams } from "react-router"
import { useObservable, useStore } from "../stores"
import { Web3Store } from "../stores/Web3Store"

export function View() {
  const { collection, id } = useParams<{ collection: string, id: string }>()

  const web3store = useStore(Web3Store)
  const provider = useObservable(web3store.provider)

  return <>
  </>
}
