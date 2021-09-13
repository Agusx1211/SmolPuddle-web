import { getStatusFleetNodes, Waku, WakuMessage } from 'js-waku'

import { Store } from './'

export const WakuTopics = {
  SmolPuddleMessage: `/smolpuddle-dev-2/1/order`
}

type WakuObserver = {
  callback: (message: WakuMessage) => void
  topics: string[]
}

export type WakuCallback<T> = {
  callback: (event: T) => void
  isEvent: (cand: Partial<T>) => cand is T
}

export class WakuStoreClass {
  public waku: Waku | undefined

  public observer: WakuObserver | undefined = undefined

  public messages: WakuMessage[] = []
  public callbacks: WakuCallback<any>[] = []

  public messageQueue: any[] = []

  constructor(private store: Store) {
    this.initWaku()
    this.connect()
  }

  connect = async (): Promise<void> => {
    if (this.waku === undefined) {
      // Start waku
      const waku = await Waku.create()
      const bootNodes = await getStatusFleetNodes()
      await Promise.all(bootNodes.map(async (n: string) => {
        try {
          console.debug("connect to", n)
          await waku.dial(n)
        } catch (e) {
          console.warn("error connecting to peer", n, e)
        }
      }))

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
        // if (!IsMessageBase(content)) {
        //   console.debug('bad message body', content)
        //   return
        // }

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

  sendMsg = async <T>(msg: T, isMsg: (cand: Partial<T>) => cand is T) => {
    try {
      if (!isMsg(msg)) {
        console.warn("drop waku msg, invalid msg body", msg)
        return
      }

      this.sendMsgInternal(msg)
    } catch (e) {
      console.error('error sending waku message', e)
    }
  }

  private sendMsgInternal = async <T>(msg: T) => {
    try {
      if (!this.waku) {
        this.messageQueue.push(msg)
        console.debug("store in queue", msg)
        return
      }

      const topic = WakuTopics.SmolPuddleMessage

      const json = JSON.stringify(msg)
      const wmgs = await WakuMessage.fromUtf8String(json, topic)
      console.debug("dispatch message", json, wmgs)
      await this.waku.relay.send(wmgs)
    } catch (e) {
      console.error('error sending waku message', e)
    }
  }

  initWaku = async () => {
    await this.connect()
    await this.listen()
    this.dispatchQueue()
  }

  isInitialized = () => {
    return this.waku !== undefined
  }

  dispatchQueue = () => {
    console.debug("dispatching waku queue")
    this.messageQueue.forEach(msg => this.sendMsgInternal(msg))
    this.messageQueue = []
  }

  listen = async () => {
    if (!this.waku) return

    const topic = WakuTopics.SmolPuddleMessage

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

export const WakuStore = {
  constructor: WakuStoreClass,
  tag: 'wakustore'
}
