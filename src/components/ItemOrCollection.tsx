import React from 'react'
import { ethers } from "ethers"
import { useParams } from "react-router-dom"
import { parseAddress } from "../types/address"
import { safe } from "../utils"
import { Collection } from "./Collection"
import { View } from "./View"


export function ItemOrCollection() {
  const { collection, id } = useParams<{ collection: string, id: string }>()

  const sid = safe(() => ethers.BigNumber.from(id))
  const scollection = parseAddress(collection)

  console.log(sid)
  // TODO: Use props for views and collection
  return <>
    { sid && <View />}
    { (scollection && !sid) && <Collection />}
  </>
}
