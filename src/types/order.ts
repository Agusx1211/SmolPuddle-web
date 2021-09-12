import { ethers } from "ethers"
import { Address } from "./address"

export const OrderAbiType = `tuple(
  address seller,
  uint256 currency,
  address askToken,
  address sellToken,
  uint256 askTokenIdOrAmount,
  uint256 sellTokenIdOrAmount,
  address[] feeRecipients,
  uint256[] feeAmountsOrIds,
  uint256 expiration,
  bytes32 salt
)`

export const Currency = {
  Ask: 0,
  Sell: 1,
  Nonce: 2
}

export function orderAbiEncode(order: OrderConstructor) {
  return {
    seller: order.seller,
    currency: order.currency,
    askToken: order.ask.token,
    sellToken: order.sell.token,
    askTokenIdOrAmount: order.ask.amountOrId,
    sellTokenIdOrAmount: order.sell.amountOrId,
    feeRecipients: order.fees.map((f) => f.recipient),
    feeAmountsOrIds: order.fees.map((f) => f.amontOrId),
    expiration: order.expiration,
    salt: order.salt
  }
}

export function orderHash(order: OrderConstructor): string {
  return ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode([OrderAbiType], [orderAbiEncode(order)])
  )
}

export function newOrder(order: OrderConstructor): OrderUnsigned {
  return {
    ...order,
    hash: orderHash(order)
  }
}

export function attachSignature(order: OrderUnsigned, signature: string): Order {
  return { ...order, signature }
}

export type OrderUnsigned = Omit<Order, 'signature'>
export type OrderConstructor = Omit<OrderUnsigned, 'hash'>

export type Order = {
  hash: string,
  currency: number,
  sell: {
    token: Address,
    amountOrId: ethers.BigNumber
  },
  ask: {
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

export function isOrderArray(cand: any): cand is Array<Order> {
  return Array.isArray(cand) && cand.find((c) => !isOrder(c)) === undefined
}
