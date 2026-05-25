2. Undici — The HTTP client Node.js should've shipped earlier
Stop using Axios for backend services.

👉 Why Undici:

Built by Node.js core team
Uses internal HTTP parser
Lower latency, better throughput

👉 When it shines:

Internal service calls
High-frequency API requests


---


Pros:
- No additional dependencies required
- Works across different JavaScript runtimes
- Automatic compression handling (gzip, deflate, br)
- Built-in caching support (in development)

Cons:
- Limited to the undici version bundled with your Node.js version
- Less control over connection pooling and advanced features
- Error handling follows Web API standards (errors wrapped in TypeError)
- Performance overhead due to Web Streams implementation
