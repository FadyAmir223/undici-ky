import { Agent } from 'undici'
import { createUndiciKy } from './modules/ky/undici-ky'

export const api = createUndiciKy({
  prefixUrl: 'https://api-aywana.novex-dev.com',
  headers: { Authorization: 'Bearer token_123' },
  dispatcher: new Agent({ keepAliveTimeout: 100000, keepAliveMaxTimeout: 100000 }),
  retries: { limit: 3, methods: ['GET', 'POST'] },
})

const res = await api.get('/api/health').json()
console.log(res)
