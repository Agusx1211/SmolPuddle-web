import { ethers } from "ethers"
import Web3Modal from "web3modal"
import { observable, Store } from "."
import { Address, isAddress } from "../types/address"

// const ARBITRUM_DEFAULT_RPC = "https://arb1.arbitrum.io/rpc"
const ARBITRUM_DEFAULT_RPC = "http://localhost:8081/http://192.168.86.53:8545/"
export class Web3Store {
  private modal: Web3Modal

  public injected = observable<ethers.providers.Web3Provider | undefined>(undefined)
  public accounts = observable<Address[] | undefined>(undefined)
  public account = this.accounts.select((a) => a ? a[0] : undefined)

  public provider = this.injected.select((injected) => injected ? injected : new ethers.providers.JsonRpcProvider(ARBITRUM_DEFAULT_RPC))

  constructor(private store: Store) {
    this.modal = new Web3Modal({
      network: "arbitrum",
      cacheProvider: false
    })

    this.injected.subscribe((injected) => {
      if (injected) {
        injected.listAccounts().then((accounts) => {
          const addresses = accounts.filter((a) => isAddress(a)).map((a) => ethers.utils.getAddress(a))
          this.accounts.set(addresses)
        })
      } else {
        this.accounts.set(undefined)
      }
    })
  }

  async connect() {
    const provider = await this.modal.connect()
    // TODO: Validate nework of provider
    this.injected.set(new ethers.providers.Web3Provider(provider))
  }
}
