import { WritableObservable, observable } from "micro-observables"

export class LocalStore<T extends Object = string, K extends T | undefined = undefined | T> {
  private _observable: WritableObservable<T | K> | undefined = undefined
  readonly key: string

  constructor(key: string, public def?: K) {
    this.key = key
  }

  get observable(): WritableObservable<T | K> {
    if (this._observable === undefined) {
      this._observable = observable(this.get())
    }

    window.addEventListener("storage", (e) => {
      if (e.key === this.key) {
        this._observable?.set(this.get())
      }
    })

    return this._observable
  }

  get(): T | K {
    const val = window.localStorage.getItem(this.key)

    if (val === null) {
      return this.def as K
    }

    try {
      return JSON.parse(val)
    } catch (err) {
      console.error(err)
    }

    return undefined as K
  }

  set(val: T | K) {
    val ? window.localStorage.setItem(this.key, JSON.stringify(val)) : window.localStorage.removeItem(this.key)
    this._observable?.set(val)
  }

  del() {
    window.localStorage.removeItem(this.key)
    this._observable?.set(this.def as K)
  }
}
