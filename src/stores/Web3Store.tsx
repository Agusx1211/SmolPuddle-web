import { ethers } from "ethers"
import { Observable } from "micro-observables"
import Web3Modal from "web3modal"
import { observable, Store } from "."
import { Address, isAddress, parseAddress } from "../types/address"
import { providers } from "@0xsequence/multicall"
import WalletConnectProvider from "@walletconnect/web3-provider"
import { NotificationsStore } from "./NotificationsStore"

export const ARBITRUM_EXPLORER = "https://arbiscan.io/"
export const ARBITRUM_DEFAULT_RPC = "https://arb1.arbitrum.io/rpc"
export const ARBITRUM_CHAIN_ID = 42161

export class Web3Store {
  private modal: Web3Modal

  public injected = observable<ethers.providers.Web3Provider | undefined>(undefined)
  public accounts = observable<Address[] | undefined>(undefined)

  public account: Observable<string | undefined>
  public provider: Observable<providers.MulticallProvider | ethers.providers.Web3Provider>
  public static = new providers.MulticallProvider(new ethers.providers.JsonRpcProvider(ARBITRUM_DEFAULT_RPC))

  public chainId = observable<number | undefined>(undefined)
  public networkId = observable<number | undefined>(undefined)

  public rightChain = this.chainId.select((c) => c === ARBITRUM_CHAIN_ID)

  constructor(private store: Store) {
    this.modal = new Web3Modal({
      network: "arbitrum",
      cacheProvider: true,
      providerOptions:{ 
        walletconnect: {
          package: WalletConnectProvider,
          options: {
            rpc: {
              [ARBITRUM_CHAIN_ID]: ARBITRUM_DEFAULT_RPC
            }
          }
        },
      }
    })

    if (this.modal.cachedProvider) {
      this.connect()
    }

    this.injected.subscribe((injected) => {
      if (injected) {
        injected.listAccounts().then((accounts) => {
          const addresses = accounts.filter((a) => isAddress(a)).map((a) => ethers.utils.getAddress(a))
          this.accounts.set(addresses)
        })
        injected.getNetwork().then((network) => {
          this.chainId.set(network.chainId)
        })
      } else {
        this.accounts.set(undefined)
      }
    })

    this.account = this.accounts.select((a) => a ? a[0] : undefined)

    this.provider = this.injected.select((injected) => this.rightChain.select((isValid) => {
      return injected && isValid ? injected : this.static
    }))  
  }

  async connect() {
    const provider = await this.modal.connect()
    const injected = new ethers.providers.Web3Provider(provider)
    // TODO: Validate nework of provider
    this.injected.set(injected)

    provider.on("close", () => this.disconnect())

    provider.on("accountsChanged", async (accounts: string[]) => {
      console.log("accounts changed", accounts)
      this.accounts.set(accounts.map((a) => parseAddress(a)).filter((a) => a) as string[])

      this.store.get(NotificationsStore).notify({
        content: `Account changed to ${this.account.get()}`,
        severity: 'info'
      })
    })

    provider.on("chainChanged", async (chainId: number) => {
      this.chainId.set(chainId)
    })

    provider.on("networkChanged", async () => {
      const provider = await this.modal.connect()
      const injected = new ethers.providers.Web3Provider(provider)
      this.injected.set(injected)
      injected.getNetwork().then((network) => {
        this.chainId.set(network.chainId)
      })
    })
  }

  async disconnect() {
    // This is a hack, I don't know of any other way of restarting walletconnect with modal
    window.localStorage.removeItem('walletconnect')

    this.modal.clearCachedProvider()
    this.injected.set(undefined)
  }

  async requestChainChange() {
    const injected = this.injected.get()
    if (!injected) return

    injected.send('wallet_addEthereumChain', [{
      chainId: ethers.BigNumber.from(ARBITRUM_CHAIN_ID).toHexString(),
      chainName: 'Arbitrum One',
      nativeCurrency: {
        name: 'Ethereum',
        symbol: 'ETH',
        decimals: 18,
      },
      rpcUrls: [ARBITRUM_DEFAULT_RPC],
      blockExplorerUrls: [ARBITRUM_EXPLORER]
    }]).then(() => {
      injected.send('wallet_switchEthereumChain', [{
        chainId: ethers.BigNumber.from(ARBITRUM_CHAIN_ID).toHexString()
      }]).catch(this.store.get(NotificationsStore).catchAndNotify)
    }).catch(this.store.get(NotificationsStore).catchAndNotify)
  }
}
