import pMap from 'p-map'
import Bottleneck from 'bottleneck'
import { urls } from '@/utils/constants'

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
  const res = await fetch(url)
  return res.json()
})

await pMap(urls, task, { concurrency: 5 })
