import { ethers } from "ethers"
import { Address } from "./address"

export const OrderAbiType = `tuple(
  address seller,
  uint256 orderType,
  address askToken,
  address sellToken,
  uint256 askTokenIdOrAmount,
  uint256 sellTokenIdOrAmount,
  address[] feeRecipients,
  uint256[] feeAmounts,
  uint256 expiration,
  bytes32 salt
)`

export const Currency = {
  Invalid: 0,
  NftToNft: 1,
  BuyNFT: 2,
  SellNFT: 3
}

export function orderAbiEncode(order: OrderConstructor) {
  return {
    seller: order.seller,
    orderType: order.currency,
    askToken: order.ask.token,
    sellToken: order.sell.token,
    askTokenIdOrAmount: ethers.BigNumber.from(order.ask.amountOrId),
    sellTokenIdOrAmount: ethers.BigNumber.from(order.sell.amountOrId),
    feeRecipients: order.fees.map((f) => f.recipient),
    feeAmounts: order.fees.map((f) => ethers.BigNumber.from(f.amontOrId)),
    expiration: ethers.BigNumber.from(order.expiration),
    salt: order.salt
  }
}

export const EIP712Header = Buffer.from('1901', 'hex')
export const DomainHash = "0xd8733b1f2a4937b27d9974b1f19a9255b2a718a67700d32bb2427674591c97dc"
export const OrderTypehash = "0x2fbfd17f75c3304428e25fe283d35e4b98b85e5a42064810e0ab9627a545e058"

export function orderHash(order: OrderConstructor): string {
  const feeRecipientsHash = ethers.utils.keccak256(
    ethers.utils.solidityPack(
      order.fees.map(() => 'address'),
      order.fees.map((f) => f.recipient)
    )
  )

  const feeAmountsOrIdsHash = ethers.utils.keccak256(
    ethers.utils.solidityPack(
      order.fees.map(() => 'uint256'),
      order.fees.map((f) => f.amontOrId)
    )
  )

  const orderStructHash = ethers.utils.keccak256(
    ethers.utils.solidityPack(
      [
        'bytes32',
        'uint256',
        'uint256',
        'uint256',
        'uint256',
        'uint256',
        'uint256',
        'bytes32',
        'bytes32',
        'uint256',
        'bytes32'
      ], [
        OrderTypehash,
        ethers.BigNumber.from(order.seller),
        ethers.BigNumber.from(order.currency),
        ethers.BigNumber.from(order.ask.token),
        ethers.BigNumber.from(order.sell.token),
        ethers.BigNumber.from(order.ask.amountOrId),
        ethers.BigNumber.from(order.sell.amountOrId),
        feeRecipientsHash,
        feeAmountsOrIdsHash,
        ethers.BigNumber.from(order.expiration),
        order.salt
      ]
    )
  )

  return ethers.utils.keccak256(
    ethers.utils.solidityPack(
      ['bytes', 'bytes32', 'bytes32'],
      [EIP712Header, DomainHash, orderStructHash]
    )
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
    cand &&
    cand.hash && typeof cand.hash === 'string' && cand.hash !== ''
  )
}

export function isOrderArray(cand: any): cand is Array<Order> {
  return Array.isArray(cand) && cand.find((c) => !isOrder(c)) === undefined
}
