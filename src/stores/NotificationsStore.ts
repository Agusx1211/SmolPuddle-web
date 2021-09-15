import { Color } from "@material-ui/lab"
import { ethers } from "ethers"
import { observable } from "micro-observables"
import { Store } from "."
import { parseError } from "../utils"
import { ARBITRUM_EXPLORER } from "./Web3Store"

export type Notification = {
  content: string,
  severity?: Color,
  action?: {
    text: string,
    onClick: () => void
  },
  onClose?: () => void
}

export function buildTxNotif(tx: ethers.providers.TransactionResponse): Notification {
  return {
    content: `Transaction sent ${tx.hash}`,
    severity: 'success',
    action: {
      text: 'View on explorer',
      onClick: () => {
        window.open(`${ARBITRUM_EXPLORER}/tx/${tx.hash}`)
      }
    }
  }
}

export class NotificationsStore {
  notifications = observable<Notification[]>([])

  constructor (private store: Store) {}

  notify = (notification: Notification) => {
    this.notifications.update((n) => [...n, notification])
  }

  shift = () => {
    this.notifications.update((n) => { n.shift(); return [...n] })
  }

  catchAndNotify = (e: any) => {
    console.warn('catchAndNotify', e)
    this.notify({ content: parseError(e), severity: 'warning' })
  }
}
