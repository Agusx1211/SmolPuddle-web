import { ethers } from "ethers"
import { safe } from "../utils"

export type Address = string

export function isAddress(cand: any): cand is Address {
  return cand && typeof cand === 'string' && ethers.utils.isAddress(cand)
}

export function shortAddress(addr: Address): string {
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`
}

export function parseAddress(cand: any): Address | undefined {
  return safe(() => ethers.utils.getAddress(cand))
}
