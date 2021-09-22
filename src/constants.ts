import { providers } from "@0xsequence/multicall"
import { ethers } from "ethers"

export const ARBITRUM_EXPLORER = "https://arbiscan.io/"
export const ARBITRUM_DEFAULT_RPC = "https://arb1.arbitrum.io/rpc"
export const ARBITRUM_CHAIN_ID = 42161

export const EXPLORER_ADDR = "https://arbiscan.io/"
export const SmolPuddleContract = "0xa39eAd9429AB35bFA7aA85786bcddA500a78155D"
export const STATIC_PROVIDER = new providers.MulticallProvider(
  new ethers.providers.JsonRpcProvider(ARBITRUM_DEFAULT_RPC),
  { batchSize: 100, timeWindow: 500, verbose: true }
)
