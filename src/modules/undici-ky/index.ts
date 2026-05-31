import Bottleneck from 'bottleneck'
import type { Options as PMapOptions } from 'p-map'
import pMap from 'p-map'
import type { Dispatcher } from 'undici'
import { request } from 'undici'

import catchError from '@/utils/catch-error'

import { HTTPError } from './http-error'
import { UndiciKyResponse } from './response'
import type { ClientOptions, NormalizedOptions, RequestOptions } from './types'

const calculateDelay = (retryCount: number, backoffLimit?: number): number => {
  const baseDelay = 2 ** retryCount * 100
  // eslint-disable-next-line sonarjs/pseudo-random
  const jitter = Math.floor(Math.random() * 50)
  const delay = baseDelay + jitter

  if (backoffLimit) return Math.min(delay, backoffLimit)
  return delay
}

export class UndiciKyClient {
  private defaultOptions: ClientOptions
  private limiter?: Bottleneck

  constructor(options: ClientOptions = {}) {
    this.defaultOptions = {
      throwHttpErrors: true,
      timeout: 10_000,
      ...options,
    }

    if (options.bottleneck) this.limiter = new Bottleneck(options.bottleneck)
  }

  extend(options: ClientOptions) {
    return new UndiciKyClient({
      ...this.defaultOptions,
      ...options,
      headers: { ...this.defaultOptions.headers, ...options.headers },
      hooks: {
        beforeRequest: [
          ...(this.defaultOptions.hooks?.beforeRequest ?? []),
          ...(options.hooks?.beforeRequest ?? []),
        ],
        afterResponse: [
          ...(this.defaultOptions.hooks?.afterResponse ?? []),
          ...(options.hooks?.afterResponse ?? []),
        ],
      },
    })
  }

  private buildUrl(endpoint: string, options: RequestOptions): URL {
    let url: URL

    try {
      url = new URL(endpoint)
    } catch {
      const prefix = options.prefixUrl ?? this.defaultOptions.prefixUrl ?? ''
      const normalizedPrefix = prefix.endsWith('/') ? prefix : `${prefix}/`
      const normalizedEndpoint = endpoint.startsWith('/')
        ? endpoint.slice(1)
        : endpoint
      url = new URL(normalizedEndpoint, normalizedPrefix)
    }

    if (options.searchParams) {
      const params = new URLSearchParams(options.searchParams as never)
      for (const [key, value] of params.entries())
        url.searchParams.append(key, value)
    }

    return url
  }

  private resolveRetryOptions(
    method: Dispatcher.HttpMethod,
    options: RequestOptions,
  ): number {
    const retry = options.retry ?? this.defaultOptions.retry

    const allowedMethods = retry?.methods ?? [
      'GET',
      'PUT',
      'HEAD',
      'DELETE',
      'OPTIONS',
    ]

    return allowedMethods.includes(method) ? (retry?.limit ?? 3) : 0
  }

  private async executeRequest(
    normalizedOpts: NormalizedOptions,
  ): Promise<Dispatcher.ResponseData> {
    if (normalizedOpts.json) {
      normalizedOpts.body = JSON.stringify(normalizedOpts.json)
      normalizedOpts.headers = {
        'content-type': 'application/json',
        ...normalizedOpts.headers,
      }
    }

    const beforeHooks = normalizedOpts.hooks?.beforeRequest ?? []
    for (const hook of beforeHooks) await hook(normalizedOpts)

    let finalSignal =
      normalizedOpts.signal instanceof AbortSignal
        ? normalizedOpts.signal
        : undefined

    if (
      normalizedOpts.timeout !== false &&
      typeof normalizedOpts.timeout === 'number'
    ) {
      const timeoutSignal = AbortSignal.timeout(normalizedOpts.timeout)

      finalSignal = finalSignal
        ? AbortSignal.any([finalSignal, timeoutSignal])
        : timeoutSignal
    }

    const performRequest = () =>
      request(normalizedOpts.url, {
        method: normalizedOpts.method,
        headers: normalizedOpts.headers,
        body: normalizedOpts.body as never,
        dispatcher: normalizedOpts.dispatcher,
        signal: finalSignal,
      })

    const res = this.limiter
      ? await this.limiter.schedule(performRequest)
      : await performRequest()

    const afterHooks = normalizedOpts.hooks?.afterResponse ?? []
    for (const hook of afterHooks) await hook(normalizedOpts, res)

    const throwErrors = normalizedOpts.throwHttpErrors ?? true
    if (throwErrors && !res.statusCode.toString().startsWith('2')) {
      await res.body.dump() // prevent memory leaks
      throw new HTTPError(res, normalizedOpts)
    }

    return res
  }

  request(endpoint: string, options: RequestOptions = {}): UndiciKyResponse {
    const method = options.method ?? 'GET'
    const url = this.buildUrl(endpoint, options)

    const normalizedOpts: NormalizedOptions = {
      ...this.defaultOptions,
      ...options,
      headers: { ...this.defaultOptions.headers, ...options.headers },
      method,
      url,
    }

    const maxRetries = this.resolveRetryOptions(method, normalizedOpts)
    let attempt = 0

    const executeWithRetry = async (): Promise<Dispatcher.ResponseData> => {
      while (true) {
        const [err, data] = await catchError(this.executeRequest(normalizedOpts))
        if (!err) return data

        const isHttpError = err instanceof HTTPError

        const statusCodes = options.retry?.statusCodes ?? [
          408, 413, 500, 502, 503, 504,
        ]

        const retryableStatus =
          isHttpError && statusCodes.includes(err.response.statusCode)

        if (attempt >= maxRetries || (isHttpError && !retryableStatus)) throw err

        const delay = (options.retry?.delay ?? calculateDelay)(
          attempt,
          options.retry?.backoffLimit,
        )

        await new Promise((resolve) => setTimeout(resolve, delay))
        attempt++
      }
    }

    return new UndiciKyResponse(executeWithRetry())
  }

  async batch<T, R>(
    items: T[],
    mapper: (item: T, index: number) => Promise<R>,
    options?: { pMap?: PMapOptions },
  ): Promise<R[]> {
    const pMapOpts = options?.pMap ?? this.defaultOptions.pMap
    if (pMapOpts) return pMap(items, mapper, pMapOpts)
    return Promise.all(items.map((item, index) => mapper(item, index)))
  }

  get(endpoint: string, options?: Omit<RequestOptions, 'method'>) {
    return this.request(endpoint, { ...options, method: 'GET' })
  }

  post(endpoint: string, options?: Omit<RequestOptions, 'method'>) {
    return this.request(endpoint, { ...options, method: 'POST' })
  }

  put(endpoint: string, options?: Omit<RequestOptions, 'method'>) {
    return this.request(endpoint, { ...options, method: 'PUT' })
  }

  patch(endpoint: string, options?: Omit<RequestOptions, 'method'>) {
    return this.request(endpoint, { ...options, method: 'PATCH' })
  }

  delete(endpoint: string, options?: Omit<RequestOptions, 'method'>) {
    return this.request(endpoint, { ...options, method: 'DELETE' })
  }

  head(endpoint: string, options?: Omit<RequestOptions, 'method'>) {
    return this.request(endpoint, { ...options, method: 'HEAD' })
  }
}

export const createUndiciKy = (options?: ClientOptions) =>
  new UndiciKyClient(options)

export const undiciKy = new UndiciKyClient()
