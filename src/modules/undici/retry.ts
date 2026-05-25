import catchError from '@/utils/catch-error'
import { request } from 'undici'

/*
🔁 Handling Failures: Retry with Backoff
Even well-controlled systems fail sometimes. What matters is how you retry.

Why this matters
- No backoff → retry storms
- With backoff → graceful recovery
*/

async function fetchWithRetry(url: string, retries = 3) {
  const [err, res] = await catchError(request(url))

  if (err) {
    if (retries === 0) throw err

    // exponential backoff
    const delay = 2 ** (3 - retries) * 100
    await new Promise((r) => setTimeout(r, delay))
    return fetchWithRetry(url, retries - 1)
  }

  return res.body.json()
}

/*
Note: Once a mixin has been called then the body cannot be reused, thus calling additional mixins on .body, e.g. .body.json(); .body.text() will result in an error TypeError: unusable being thrown and returned through the Promise rejection.

Should you need to access the body in plain-text after using a mixin, the best practice is to use the .text() mixin first and then manually parse the text to the desired format.

---

undici.request([url, options]): Promise
Arguments:

url string | URL | UrlObject
options RequestOptions
dispatcher Dispatcher - Default: getGlobalDispatcher
method String - Default: PUT if options.body, otherwise GET
Returns a promise with the result of the Dispatcher.request method.

Calls options.dispatcher.request(options).

See Dispatcher.request for more details, and request examples for examples.
*/

/*
Garbage Collection
https://fetch.spec.whatwg.org/#garbage-collection
The Fetch Standard allows users to skip consuming the response body by relying on garbage collection to release connection resources.

Garbage collection in Node is less aggressive and deterministic (due to the lack of clear idle periods that browsers have through the rendering refresh rate) which means that leaving the release of connection resources to the garbage collector can lead to excessive connection usage, reduced performance (due to less connection re-use), and even stalls or deadlocks when running out of connections. Therefore, it is important to always either consume or cancel the response body anyway.

// Do
const { body, headers } = await fetch(url);
for await (const chunk of body) {
  // force consumption of body
}

// Do not
const { headers } = await fetch(url);
However, if you want to get only headers, it might be better to use HEAD request method. Usage of this method will obviate the need for consumption or cancelling of the response body. See

However, if you want to get only headers, it might be better to use HEAD request method. Usage of this method will obviate the need for consumption or cancelling of the response body. See MDN - HTTP - HTTP request methods - HEAD for more details.

const headers = await fetch(url, { method: 'HEAD' })
  .then(res => res.headers)
Note that consuming the response body is mandatory for request:

// Do
const { body, headers } = await request(url);
await body.dump(); // force consumption of body

// Do not
const { headers } = await request(url);
*/

/*
i think good if i need to make singleton and only pass endpoints

undici.getGlobalDispatcher()
Gets the global dispatcher used by Common API Methods.

Returns: Dispatcher

undici.setGlobalOrigin(origin)
origin string | URL | undefined
Sets the global origin used in fetch.

If undefined is passed, the global origin will be reset. This will cause Response.redirect, new Request(), and fetch to throw an error when a relative path is passed.

setGlobalOrigin('http://localhost:3000')

const response = await fetch('/api/ping')

console.log(response.url) // http://localhost:3000/api/ping
*/
