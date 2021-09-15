import { Store } from "."

export const IpfsGateway = 'https://cloudflare-ipfs.com/ipfs/'
export function cleanHash(uri: string): string {
  return uri.replace('ipfs://ipfs/', '').replace('ipfs://', '')
}

const PROXY = window.location.hostname === "localhost"
  ? "https://worker.smolpuddle.io/cors-proxy/?"
  : "https://worker.smolpuddle.io/cors-proxy/?"


export class IpfsStore {
  constructor(private store: Store) {}

  toGateway(hash: string): string {
    return `${IpfsGateway}${hash}`
  }

  mapToURI(uri: string): string {
    const clean = cleanHash(uri)

    if (uri.startsWith('ipfs://')) {
      return `${IpfsGateway}${clean}`
    }

    if (clean.length === 59 || clean.length === 46) {
      return `${IpfsGateway}${clean}`
    }

    if (uri.includes('https://') || uri.includes('http://')) {
      return `${PROXY}${uri}`
    }

    return uri
  }
}

// export const IpfsStore = {
//   constructor: IpfsStoreClass,
//   tag: 'ipfsstore'
// }
