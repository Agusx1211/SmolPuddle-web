import { ethers } from "ethers"

export type Address = string

export function isAddress(cand: any): cand is Address {
  return cand && typeof cand === 'string' && ethers.utils.isAddress(cand)
}
