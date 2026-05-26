import { request, Dispatcher } from 'undici'
import pMap, { Options as PMapOptions } from 'p-map'
import Bottleneck from 'bottleneck'
import catchError from '@/utils/catch-error'

// 2. Exponential Backoff with Jitter
const calculateDelay = (retryCount: number): number => {
  const baseDelay = 2 ** retryCount * 100 // 100, 200, 400, 800...
  const jitter = Math.floor(Math.random() * 50) // Prevent retry storms
  return baseDelay + jitter
}

export type RetryOptions = {
  limit?: number
  methods?: Dispatcher.HttpMethod[]
}

export type ClientOptions = {
  prefixUrl?: string
  retries?: number | RetryOptions
  headers?: Record<string, string>
  dispatcher?: Dispatcher
  pMap?: PMapOptions
  bottleneck?: Bottleneck.ConstructorOptions
}

export type RequestOptions = Omit<ClientOptions, 'prefixUrl'> & {
  method?: Dispatcher.HttpMethod
  body?: Dispatcher.HttpMethod | Buffer | Uint8Array
  query?: Record<string, string>
}

export type BatchOptions = {
  pMap?: PMapOptions
  bottleneck?: Bottleneck.ConstructorOptions
}

class ResponseWrapper {
  constructor(
    public statusCode: number,
    public headers: Record<string, string | string[] | undefined>,
    private body: any,
  ) {}

  async json<T = any>(): Promise<T> {
    return this.body.json()
  }

  async text(): Promise<string> {
    return this.body.text()
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    return this.body.arrayBuffer()
  }

  // mandatory for GC if json/text aren't used
  async dump(): Promise<void> {
    await this.body.dump()
  }
}

export class HttpClient {
  private prefixUrl: string
  private defaultOptions: ClientOptions

  constructor(options: ClientOptions = {}) {
    this.prefixUrl = options.prefixUrl?.replace(/\/$/, '') || ''
    this.defaultOptions = options
  }

  private buildUrl(endpoint: string, query?: Record<string, string>): string {
    const isAbsolute = /^https?:\/\//i.test(endpoint)
    let url = isAbsolute
      ? endpoint
      : `${this.prefixUrl}/${endpoint.replace(/^\//, '')}`

    if (query) {
      const searchParams = new URLSearchParams(query)
      url += `?${searchParams.toString()}`
    }
    return url
  }

  private resolveRetryOptions(
    reqMethod: string,
    reqOptions?: RequestOptions,
  ): number {
    const retries = reqOptions?.retries ?? this.defaultOptions.retries ?? 3

    if (typeof retries === 'number') return retries

    const allowedMethods =
      retries.methods ||
      (['GET', 'PUT', 'HEAD', 'DELETE'] satisfies Dispatcher.HttpMethod[])

    return allowedMethods.includes(reqMethod) ? (retries.limit ?? 3) : 0
  }

  async request(
    endpoint: string,
    options: RequestOptions = {
      method: 'GET',
    },
  ): Promise<ResponseWrapper> {
    const url = this.buildUrl(endpoint, options.query)
    const headers = { ...this.defaultOptions.headers, ...options.headers }
    const dispatcher = options.dispatcher || this.defaultOptions.dispatcher

    const maxRetries = this.resolveRetryOptions(options.method!, options)

    let attempt = 0

    while (true) {
      const [err, res] = await catchError(
        request(url, {
          method: options.method!,
          headers,
          body: options.body,
          dispatcher,
        }),
      )

      if (!err) return new ResponseWrapper(res.statusCode, res.headers, res.body)

      if (attempt >= maxRetries) throw err

      const delay = calculateDelay(attempt)
      await new Promise((r) => setTimeout(r, delay))
      attempt++
    }
  }

  get(endpoint: string, options?: Omit<RequestOptions, 'method'>) {
    const req = this.request(endpoint, { ...options, method: 'GET' })

    return {
      json: async <T>() => (await req).json<T>(),
      text: async () => (await req).text(),
      dump: async () => (await req).dump(),
      raw: async () => req,
    }
  }

  post(endpoint: string, options?: Omit<RequestOptions, 'method'>) {
    const req = this.request(endpoint, { ...options, method: 'POST' })

    return {
      json: async <T>() => (await req).json<T>(),
      text: async () => (await req).text(),
      dump: async () => (await req).dump(),
      raw: async () => req,
    }
  }

  async batch<T, R>(
    items: T[],
    mapper: (item: T, index: number) => Promise<R>,
    options?: BatchOptions,
  ): Promise<R[]> {
    const pMapOpts = options?.pMap ?? this.defaultOptions.pMap
    const bottleOpts = options?.bottleneck ?? this.defaultOptions.bottleneck

    let execute = mapper

    if (bottleOpts) execute = new Bottleneck(bottleOpts).wrap(mapper)
    if (pMapOpts) return pMap(items, execute, pMapOpts)

    return Promise.all(items.map((item, index) => execute(item, index)))
  }
}

export const createUndiciKy = (options?: ClientOptions) => new HttpClient(options)
