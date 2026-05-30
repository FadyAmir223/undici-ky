import { Dispatcher } from 'undici'
import { NormalizedOptions } from './types'

export class HTTPError extends Error {
  constructor(
    public response: Dispatcher.ResponseData,
    public requestOptions: NormalizedOptions,
  ) {
    super(`Request failed with status code ${response.statusCode}`)
    this.name = 'HTTPError'
  }
}
