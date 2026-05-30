### get 
```ts
import { createUndiciKy } from './modules/ky/undici-ky'

const api = createUndiciKy({ prefixUrl: 'https://api-aywana.novex-dev.com' })
const data = await api.get('api/health', { searchParams: { admin: true } }).json()
console.log(data)
```


### post
```ts
import { createUndiciKy } from './modules/ky/undici-ky'

const json = {
  imageUrl:
    'https://s3.novex-dev.com/polaroid-stage/submissions/01111111111_28c0ca3a-acde-4b6f-ba5b-280895ee1e16.webp',
  phoneNumber: '01111111111',
}

const api = createUndiciKy({ prefixUrl: 'https://api-polaroid.novex-dev.com/api' })
const data = await api.post('storage/create-submission', { json }).json()
console.log(data)
```


### concurrency & rate-limit
```ts
import { createUndiciKy } from './modules/ky/undici-ky'

const rateLimitedApi = createUndiciKy({
  prefixUrl: 'https://api-aywana.novex-dev.com',
  bottleneck: {
    maxConcurrent: 2, // Max 2 requests at a time
    minTime: 500, // Wait at least 500ms between requests
    reservoir: 50, // Max 50 requests...
    reservoirRefreshAmount: 50, // ...per...
    reservoirRefreshInterval: 60 * 1000, // ...1 minute
  },
})

// Even if you fire 10 requests at once, Bottleneck spaces them out safely:
const data = await Promise.all([
  rateLimitedApi.get('api/health').json(),
  rateLimitedApi.get('api/health').json(),
  rateLimitedApi.get('api/health').json(),
])

console.log(data)
```


### hooks
```ts
import { createUndiciKy } from './modules/ky/undici-ky'

let token = 'initial_token'

const api = createUndiciKy({
  prefixUrl: 'https://api-aywana.novex-dev.com',
  hooks: {
    beforeRequest: [
      async (options) => {
        options.headers = {
          ...options.headers,
          Authorization: `Bearer ${token}`,
        }
      },
    ],
    afterResponse: [
      async (_requestOptions, response) => {
        console.log(`[API] ${response.statusCode} received`)
      },
    ],
  },
})

const data = await api.get('api/health').json()
console.log(data)
```


### extend
```ts
import { createUndiciKy } from './modules/ky/undici-ky'

const baseApi = createUndiciKy({ prefixUrl: 'https://api-aywana.novex-dev.com' })

const api = baseApi.extend({
  prefixUrl: 'https://api-aywana.novex-dev.com/api',
  headers: { 'X-Version': '2' },
})

const data = await api.get('health').json()
console.log(data)
```


### p-map
```ts
import { createUndiciKy } from './modules/ky/undici-ky'

const api = createUndiciKy({ prefixUrl: 'https://api-aywana.novex-dev.com' })

const list = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

const data = await api.batch(list, (id) => api.get(`api/health`).json(), {
  pMap: { concurrency: 3 },
})

console.log(data)
```


### connection pool
```ts
import { Agent } from 'undici'
import { createUndiciKy } from './modules/ky/undici-ky'

const apiWithPool = createUndiciKy({
  prefixUrl: 'https://api-aywana.novex-dev.com',
  dispatcher: new Agent({
    keepAliveTimeout: 10000,
    keepAliveMaxTimeout: 10000,
    connections: 100, // connection pool size
  }),
})

const data = await apiWithPool.get('/api/health').json()

console.log(data)
```
