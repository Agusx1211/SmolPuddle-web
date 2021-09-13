import { ethers } from "ethers"
import { Observable } from "micro-observables"
import Web3Modal from "web3modal"
import { observable, Store } from "."
import { Address, isAddress } from "../types/address"
import { providers } from "@0xsequence/multicall"

const ARBITRUM_DEFAULT_RPC = "https://arb1.arbitrum.io/rpc"

export class Web3StoreClass {
  private modal: Web3Modal

  public injected = observable<ethers.providers.Web3Provider | undefined>(undefined)
  public accounts = observable<Address[] | undefined>(undefined)

  public account: Observable<string | undefined>
  public provider: Observable<providers.MulticallProvider | ethers.providers.Web3Provider>

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

    this.account = this.accounts.select((a) => a ? a[0] : undefined)

    const provider = new providers.MulticallProvider(new ethers.providers.JsonRpcProvider(ARBITRUM_DEFAULT_RPC))
    this.provider = this.injected.select((injected) => injected ? injected : provider)  
  }

  async connect() {
    const provider = await this.modal.connect()
    // TODO: Validate nework of provider
    this.injected.set(new ethers.providers.Web3Provider(provider))
  }
}

export const Web3Store = {
  constructor: Web3StoreClass,
  tag: 'web3store'
}
