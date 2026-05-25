import { urls } from '@/utils/constants'
import pMap from 'p-map'

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
    const res = await fetch(url)
    return res.json()
  },
  { concurrency: 5 },
)
