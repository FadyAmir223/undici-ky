import { Agent } from 'undici'
import { createUndiciKy } from './modules/undici-ky'

// ############## GET ##############
const apiGet = createUndiciKy({ prefixUrl: 'https://api-aywana.novex-dev.com' })
const dataGet = await apiGet
  .get('api/health', { searchParams: { admin: true } })
  .json()
console.log('GET: ', dataGet)

// ############## POST ##############
const json = {
  imageUrl:
    'https://s3.novex-dev.com/polaroid-stage/submissions/01111111111_28c0ca3a-acde-4b6f-ba5b-280895ee1e16.webp',
  phoneNumber: '01111111111',
}

const apiPost = createUndiciKy({
  prefixUrl: 'https://api-polaroid.novex-dev.com/api',
})
const dataPost = await apiPost.post('storage/create-submission', { json }).json()
console.log('POST: ', dataPost)

// ############## concurrency & rate-limit ##############
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

const rateLimitData = await Promise.all([
  rateLimitedApi.get('api/health').json(),
  rateLimitedApi.get('api/health').json(),
  rateLimitedApi.get('api/health').json(),
])

console.log('concurrency & rate-limit: ', rateLimitData)

// ############## HOOKS ##############
const token = 'token'

const hooksApi = createUndiciKy({
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

const data = await hooksApi.get('api/health').json()
console.log('HOOKS: ', data)

// ############## EXTEND ##############
const baseApi = createUndiciKy({ prefixUrl: 'https://api-aywana.novex-dev.com' })

const extendApi = baseApi.extend({
  prefixUrl: 'https://api-aywana.novex-dev.com/api',
  headers: { 'X-Version': '2' },
})

const extendData = await extendApi.get('health').json()
console.log('EXTEND: ', extendData)

// ############## P-MAP ##############
const api = createUndiciKy({ prefixUrl: 'https://api-aywana.novex-dev.com' })

const list = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

const pMapData = await api.batch(list, (id) => api.get(`api/health`).json(), {
  pMap: { concurrency: 3 },
})

console.log('P-MAP: ', pMapData)

// ############## CONNECTION-POOL ##############
const poolApi = createUndiciKy({
  prefixUrl: 'https://api-aywana.novex-dev.com',
  dispatcher: new Agent({
    keepAliveTimeout: 10000,
    keepAliveMaxTimeout: 10000,
    connections: 100, // connection pool size
  }),
})

const poolData = await poolApi.get('/api/health').json()

console.log('CONNECTION-POOL: ', poolData)
