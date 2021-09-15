import { Store } from "."
import { LocalStore } from "./utils/LocalStore"

export class AlertsAndTermsStoreClass {
  public closedSign = new LocalStore<boolean, boolean>("@smolpuddle.closed.alert", false)
  constructor (private store: Store) {}
}

export const AlertsAndTermsStore = {
  constructor: AlertsAndTermsStoreClass,
  tag: 'AlertsAndTermsStore'
}
