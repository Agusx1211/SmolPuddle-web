import { ethers } from "ethers"
import { ERC721Abi } from "../abi/ERC721"
import { SmolPuddleAbi } from "../abi/SmolPuddle"
import { SmolPuddleContract } from "../constants"
import { Currency, Order, orderHash } from "../types/order"
import { safe } from "../utils"

export const DefaultAskCurrency = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"

export function isSupportedOrder(order: Order): boolean {
  return (
    order.currency === Currency.SellNFT &&
    order.ask.token === DefaultAskCurrency
  )
}

export function isValidSignature(order: Order) {
  const sigV = order.signature.slice(130,132)
  if (sigV != '1b' && sigV != '1c') {
    return false
  }

  const signer = ethers.utils.verifyMessage(ethers.utils.arrayify(order.hash), order.signature.slice(0,132));
  return signer === order.seller ? true : false
}

export async function filterStatus(
  provider: ethers.providers.Provider,
  orders: Order[]
): Promise<{
  open: Order[],
  executed: Order[],
  canceled: Order[],
  badOwner: Order[]
}> {
  // TODO: We should check more things
  // like NFT ownership and approvalForAll status
  const contract = new ethers.Contract(SmolPuddleContract, SmolPuddleAbi).connect(provider)
  const statuses = await Promise.all(orders.map((o) => safe(() => contract.status(o.seller, o.hash))))

  const open = orders.filter((_, i) => statuses[i] && statuses[i].eq(0))
  const executed = orders.filter((_, i) => statuses[i] && statuses[i].eq(1))
  const canceled = orders.filter((_, i) => statuses[i] && statuses[i].eq(2))

  // Only filter by correct owners on open orders
  const owners = await Promise.all(open.map(async (o) => {
    const contract = new ethers.Contract(o.sell.token, ERC721Abi).connect(provider)
    try {
      return await contract.ownerOf(o.sell.amountOrId)
    } catch (e) { console.warn(e)}
  }))

  const badOwner = open.filter((o, i) => owners[i] !== undefined && owners[i] !== o.seller)
  const finalOpen = open.filter((o) => badOwner.find((c) => c.hash === o.hash) === undefined)

  return { open: finalOpen, executed, canceled, badOwner }
}


export function cleanOrders(orders: Order[]): Order[] {
  return orders.map((order) => {
    if (order) { 
      // Add to list of known orders
      // TODO: let's do some sanity checks first (to avoid flooding)
      // ideas:
      //        check if seller has token, sanity check amounts, check isApproved
      //        put a limit of orders per-seller, check if seller has balance, etc
      if (!order.hash || safe(() => orderHash(order)) !== order.hash) {
        console.info('Drop order', order, 'invalid hash')
        return undefined
      }

      if (!isSupportedOrder(order)) {
        console.info('Drop unsuported order type', order)
        return undefined
      }

      if (!isValidSignature(order)) {
        // Check if sig version is wrong
        const sigV = order.signature.slice(130,132)
        if (sigV == '00' || sigV == '01') {
          // Since some older order may have broken signatures
          const newVersion = parseInt(sigV) + 27
          order.signature = order.signature.slice(0,130) + newVersion.toString(16) + order.signature.slice(132,134)

        } else {
          console.info('Drop invalid signature', order)
          return undefined
        }
      }
    }

    return order
  }).filter((o) => o !== undefined) as Order[]
}