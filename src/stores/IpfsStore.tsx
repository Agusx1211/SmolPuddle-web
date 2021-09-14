import { Store } from "."

export const IpfsGateway = 'https://cloudflare-ipfs.com/ipfs/'
export function isIpfs(uri: string): boolean {
  return uri.startsWith('ipfs://') || (!uri.includes("http") && !uri.includes("https"))
}

export class IpfsStoreClass {
  constructor(private store: Store) {}

  mapToURI(ipfs: string): string {
    if (!isIpfs(ipfs)) return ipfs
    const cleanHash = ipfs.replace('ipfs://ipfs/', '').replace('ipfs://', '')
    return `${IpfsGateway}${cleanHash}`
  }
}

export const IpfsStore = {
  constructor: IpfsStoreClass,
  tag: 'ipfsstore'
}
