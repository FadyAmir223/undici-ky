import { urls, url } from '@/utils/constants'
import pMap from 'p-map'
import { request } from 'undici'

/*
⚙️ Step 1: Control Concurrency with p-map
When you want to limit how many tasks run at the same time, use p-map.

What changed?
- Only 5 requests run at once
- Others wait in a queue
- Memory + CPU stay stable

Key Insight
Concurrency is not about speed. It's about controlled pressure.
*/

const result = await pMap(
  urls,
  async (url) => {
    // Use undici.request for maximum performance
    const { statusCode, headers, body } = await request(url)
    const data = await body.json()
  },
  { concurrency: 5 },
)
