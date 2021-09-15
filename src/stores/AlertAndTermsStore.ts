import { Store } from "."
import { LocalStore } from "./LocalStore"

export class AlertsAndTermsStore {
  public closedSign = new LocalStore<boolean, boolean>("@smolpuddle.closed.alert", false)
  constructor (private store: Store) {}
}
