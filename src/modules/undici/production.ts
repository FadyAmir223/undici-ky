import pMap from 'p-map'
import Bottleneck from 'bottleneck'
import { urls } from '@/utils/constants'
import { request } from 'undici'

/*
🔥 Production Pattern (Use This)

This gives you:
- Stable concurrency
- Rate limit safety
- Predictable load
*/

const limiter = new Bottleneck({
  minTime: 200,
})

const task = limiter.wrap(async (url: string) => {
  // const res = await fetch(url)
  // return res.json()
  const { statusCode, headers, body } = await request(url)
  const data = await body.json()
})

await pMap(urls, task, { concurrency: 5 })
