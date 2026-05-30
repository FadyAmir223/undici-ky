import { Dispatcher } from 'undici'
import { Options as PMapOptions } from 'p-map'
import Bottleneck from 'bottleneck'

export type RetryOptions = {
  limit?: number
  methods?: Dispatcher.HttpMethod[]
  statusCodes?: number[]
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
  'path' | 'method' | 'origin'
> & {
  prefixUrl?: string
  retries?: number | RetryOptions
  hooks?: Hooks
  bottleneck?: Bottleneck.ConstructorOptions
  pMap?: PMapOptions
  throwHttpErrors?: boolean
  dispatcher?: Dispatcher
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
