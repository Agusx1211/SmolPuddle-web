import { Store } from "."

export const IpfsGateway = 'https://cloudflare-ipfs.com/ipfs/'
export function isIpfs(uri: string): boolean {
  return uri.startsWith('ipfs://')
}

export class IpfsStoreClass {
  constructor(private store: Store) {}

  mapToURI(ipfs: string): string {
    return isIpfs(ipfs) ? ipfs.replace('ipfs://', IpfsGateway) : ipfs
  }
}

export const IpfsStore = {
  constructor: IpfsStoreClass,
  tag: 'ipfsstore'
}
