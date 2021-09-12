import { Store } from "."

export const IpfsGateway = 'https://cloudflare-ipfs.com/'
export function isIpfs(uri: string): boolean {
  return uri.startsWith('ipfs://')
}

export class IpfsStore {
  constructor(private store: Store) {}

  mapToURI(ipfs: string): string {
    return isIpfs(ipfs) ? ipfs.replace('ipfs://', IpfsGateway) : ipfs
  }
}
