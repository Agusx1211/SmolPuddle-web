import { ethers } from "ethers"

export type Address = string

export function isAddress(cand: any): cand is Address {
  return cand && typeof cand === 'string' && ethers.utils.isAddress(cand)
}

export function shortAddress(addr: Address): string {
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`
}
