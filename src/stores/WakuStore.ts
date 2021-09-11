import { ethers } from 'ethers'
import { Waku, getStatusFleetNodes, WakuMessage } from 'js-waku'

import { Store } from './'

export const WakuTopics = {
  SmolseaMessage: `/smolsea/1/order`
}

type WakuObserver = {
  callback: (message: WakuMessage) => void
  topics: string[]
}

export type WakuMessageInternal = {
  timestamp: number
  salt: string
  sender: string
}

export type WakuMessageBase = WakuMessageInternal & {
  type: string
}

export const IsMessageBase = (cand: any): cand is WakuMessageBase => {
  return (
    cand &&
    cand.type &&
    typeof cand.type === 'string' &&
    cand.type !== '' &&
    cand.timestamp &&
    typeof cand.timestamp === 'number' &&
    cand.timestamp > 0 &&
    cand.salt &&
    typeof cand.salt === 'string' &&
    cand.salt !== '' &&
    cand.sender &&
    typeof cand.sender === 'string' &&
    ethers.utils.isAddress(cand.sender)
  )
}

export type WakuCallback<T extends WakuMessageBase> = {
  callback: (event: T) => void
  isEvent: (cand: WakuMessageBase & Partial<T>) => cand is T
}

// WakuStores uses Symmetric encryption for the messages
//
// this is not ideal because for it we need to get a shared key accross all devices
// this is not  a problem right now because we have the TorusSigner as a common key, and we can derive a encryption key from it
//
// ideally we should use Asymmetric and have keys for each signer, however there are liveness challangues with that technique
// for example, how can we retrieve past messages when the user opens a new session but the old session is closed ?

export class WakuStore {
  public waku: Waku | undefined

  public observer: WakuObserver | undefined = undefined

  public messages: WakuMessage[] = []
  public callbacks: WakuCallback<any>[] = []

  public messageQueue: WakuMessageBase[] = []

  constructor(private store: Store) {
    this.initWaku()
  }

  connect = async (): Promise<void> => {
    if (this.waku === undefined) {
      // Start waku
      const waku = await Waku.create()
      const bootNodes = await getStatusFleetNodes()
      await Promise.all(bootNodes.map(n => waku.dial(n)))
      this.waku = waku

      // Start listening
      this.listen()

      // Dispatch queue if we have any saved msgs
      this.dispatchQueue()
    }
  }

  onEvent = (callback: WakuCallback<any>) => {
    // Register callback for future events
    this.callbacks.push(callback)

    // Eval callback for known events
    if (this.isInitialized()) this.callCallbacks([callback], ...this.messages)
  }

  callCallbacks = (callbacks: WakuCallback<any>[], ...msgs: WakuMessage[]) => {
    msgs.forEach(msg => {
      try {
        const content = JSON.parse(msg.payloadAsUtf8)

        // Ignore message if it doesn't follow format
        if (!IsMessageBase(content)) {
          console.log('bad message body', msg)
          return
        }

        console.debug('Received message', content)

        callbacks.forEach(c => {
          if (c.isEvent(content)) {
            c.callback(content)
          }
        })
      } catch (e) {
        console.error('error processing waku message', msg, e)
      }
    })
  }

  sendMsg = async (rmsg: Omit<WakuMessageBase, keyof WakuMessageInternal> | WakuMessageBase) => {
    try {
      const msg = rmsg as WakuMessageBase

      if (msg.timestamp === undefined || msg.timestamp === 0) {
        msg.timestamp = new Date().getTime()
        msg.salt = ethers.utils.hexlify(ethers.utils.randomBytes(32))
      }

      if (!this.waku) {
        this.messageQueue.push(msg)
        return
      }

      const topic = WakuTopics.SmolseaMessage

      const json = JSON.stringify(msg)
      const wmgs = await WakuMessage.fromUtf8String(json, topic)
      await this.waku.relay.send(wmgs)
    } catch (e) {
      console.error('error sending waku message', e)
    }
  }

  initWaku = () => {
    this.listen()
    this.dispatchQueue()
  }

  isInitialized = () => {
    return this.waku !== undefined
  }

  dispatchQueue = () => {
    this.messageQueue.forEach(msg => this.sendMsg(msg))
    this.messageQueue = []
  }

  listen = async () => {
    if (!this.waku) return

    const topic = WakuTopics.SmolseaMessage

    // Remove old encryption keys
    this.waku.relay.decryptionKeys.forEach(k => {
      this.waku?.relay.deleteDecryptionKey(k)
    })

    if (this.observer) {
      if (this.observer.topics.length > 0 || this.observer.topics[0] !== topic) {
        this.messages = []
        this.waku.relay.deleteObserver(this.observer.callback, this.observer.topics)
      } else {
        return
      }
    }

    const callback = async (msg: WakuMessage) => {
      this.messages.push(msg)
      this.callCallbacks(this.callbacks, msg)
    }

    this.waku.relay.addObserver(callback, [topic])

    try {
      await this.waku.store.queryHistory({
        contentTopics: [topic],
        callback: (msgs: WakuMessage[]) => {
          this.messages.push(...msgs)
          this.callCallbacks(this.callbacks, ...msgs)
        }
      })
    } catch (e) {
      console.warn('error query waku history', e)
    }
  }

  resetWaku = () => {
    this.messages = []

    if (this.observer) {
      this.waku?.relay.deleteObserver(this.observer.callback, this.observer.topics)
    }
  }
}
