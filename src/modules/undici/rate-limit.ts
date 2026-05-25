import { urls } from '@/utils/constants'
import Bottleneck from 'bottleneck'
import { request } from 'undici'

/*
🚦 Step 2: Respect Rate Limits with Bottleneck

What this does
- Controls concurrency ✔
- Spreads requests over time ✔
- Prevents bursts ✔

You're no longer spiking the API. You're pacing it.
*/

const limiter = new Bottleneck({
  maxConcurrent: 5,
  minTime: 200, // ~5 requests per second
})

const fetchWithLimit = limiter.wrap(async (url: string) => {
  const { statusCode, headers, body } = await request(url)
  const data = await body.json()
})

const results = await Promise.all(urls.map(fetchWithLimit))
