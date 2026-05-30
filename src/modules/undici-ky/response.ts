import { Dispatcher } from 'undici'

export class UndiciKyResponse implements Promise<Dispatcher.ResponseData> {
  readonly [Symbol.toStringTag] = 'UndiciKyResponse'

  constructor(private reqPromise: Promise<Dispatcher.ResponseData>) {}

  then<TResult1 = Dispatcher.ResponseData, TResult2 = never>(
    onfulfilled?:
      | ((value: Dispatcher.ResponseData) => TResult1 | PromiseLike<TResult1>)
      | undefined
      | null,
    onrejected?:
      | ((reason: any) => TResult2 | PromiseLike<TResult2>)
      | undefined
      | null,
  ): Promise<TResult1 | TResult2> {
    return this.reqPromise.then(onfulfilled, onrejected)
  }

  catch<TResult = never>(
    onrejected?:
      | ((reason: any) => TResult | PromiseLike<TResult>)
      | undefined
      | null,
  ): Promise<Dispatcher.ResponseData | TResult> {
    return this.reqPromise.catch(onrejected)
  }

  finally(
    onfinally?: (() => void) | undefined | null,
  ): Promise<Dispatcher.ResponseData> {
    return this.reqPromise.finally(onfinally)
  }

  async json<T = unknown>(): Promise<T> {
    const res = await this.reqPromise
    return res.body.json() as Promise<T>
  }

  async text(): Promise<string> {
    const res = await this.reqPromise
    return res.body.text()
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    const res = await this.reqPromise
    return res.body.arrayBuffer()
  }

  async dump(): Promise<void> {
    const res = await this.reqPromise
    await res.body.dump()
  }
}
