import type Bottleneck from 'bottleneck'
import type { Options as PMapOptions } from 'p-map'
import type { Dispatcher } from 'undici'

export type RetryOptions = {
  limit?: number
  methods?: Dispatcher.HttpMethod[]
  statusCodes?: number[]
  delay?: (attempt: number) => number
  backoffLimit?: number
}

type Hooks = {
  beforeRequest?: ((options: NormalizedOptions) => void | Promise<void>)[]
  afterResponse?: ((
    requestOptions: NormalizedOptions,
    response: Dispatcher.ResponseData,
  ) => void | Promise<void>)[]
}

export type ClientOptions = Omit<
  Dispatcher.RequestOptions,
  'path' | 'method' | 'origin' | 'signal'
> & {
  prefixUrl?: string
  retry?: RetryOptions
  hooks?: Hooks
  bottleneck?: Bottleneck.ConstructorOptions
  pMap?: PMapOptions
  throwHttpErrors?: boolean
  dispatcher?: Dispatcher
  timeout?: number | false
  signal?: AbortSignal | null
}

export type RequestOptions = ClientOptions & {
  method?: Dispatcher.HttpMethod
  json?: unknown
  searchParams?: Record<string, string | number | boolean> | URLSearchParams
}

export type NormalizedOptions = RequestOptions & {
  method: Dispatcher.HttpMethod
  url: URL
}
