import { ethers } from "ethers"
import { Address } from "./address"

export type Order = {
  hash: string,
  sell: {
    token: Address,
    amountOrId: ethers.BigNumber
  },
  pay: {
    token: Address,
    amountOrId: ethers.BigNumber
  }
  seller: Address,
  expiration: ethers.BigNumber,
  salt: string,
  fees: {
    recipient: Address,
    amontOrId: ethers.BigNumber
  }[],
  signature: string
}

export function isOrder(cand: any): cand is Order {
  return (
    cand && cand.hash && typeof cand.hash === 'string'
  )
}
