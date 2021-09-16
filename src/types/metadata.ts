

export type Metadata = {
  name: string,
  description: string,
  image: string,
  image_url?: string
}

export function isMetadata(cand: any): cand is Metadata {
  // TODO Check
  return true
}

export type CollectionMetadata = {
  name?: string,
  symbol?: string
}
