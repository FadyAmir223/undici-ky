import catchError from '@/utils/catch-error'

/*
🔁 Handling Failures: Retry with Backoff
Even well-controlled systems fail sometimes. What matters is how you retry.

Why this matters
- No backoff → retry storms
- With backoff → graceful recovery
*/

async function fetchWithRetry(url: string, retries = 3) {
  const [err, res] = await catchError(fetch(url))

  if (err) {
    if (retries === 0) throw err

    // exponential backoff
    const delay = 2 ** (3 - retries) * 100
    await new Promise((r) => setTimeout(r, delay))
    return fetchWithRetry(url, retries - 1)
  }

  if (!res.ok) throw new Error('Failed')
  return res.json()
}
