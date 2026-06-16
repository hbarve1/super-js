// HTTP Client — fetch wrapper with Result<T,E>

type HttpError =
  | NetworkError { message: string }
  | HttpStatus { code: number; message: string }
  | Timeout { afterMs: number }
  | ParseError { message: string }

type Result<T, E> = | Ok(T) | Err(E)

type RequestConfig {
  method: string
  headers: Record<string, string>
  body: string?
  timeoutMs: number
  retries: number
}

const DEFAULT_CONFIG: RequestConfig = {
  method: 'GET',
  headers: {},
  body: null,
  timeoutMs: 5000,
  retries: 1
}

async function httpRequest<T>(
  url: string,
  config: RequestConfig
): Promise<Result<T, HttpError>> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), config.timeoutMs)

  try {
    const res = await fetch(url, {
      method: config.method,
      headers: config.headers,
      body: config.body ?? undefined,
      signal: controller.signal
    })
    clearTimeout(timer)

    if (!res.ok) {
      return Err(HttpStatus({ code: res.status, message: res.statusText }))
    }

    try {
      const data: dynamic = await res.json()
      return Ok(data)
    } catch (e) {
      return Err(ParseError({ message: String(e) }))
    }
  } catch (e) {
    clearTimeout(timer)
    const msg = String(e)
    if (msg.includes('abort') || msg.includes('timeout')) {
      return Err(Timeout({ afterMs: config.timeoutMs }))
    }
    return Err(NetworkError({ message: msg }))
  }
}

async function withRetry<T>(
  op: () => Promise<Result<T, HttpError>>,
  retries: number
): Promise<Result<T, HttpError>> {
  for (let i = 0; i <= retries; i++) {
    const result = await op()
    match result {
      Ok(_) => return result
      Err(err) => {
        const shouldRetry = match err {
          NetworkError(_) => i < retries
          Timeout(_) => i < retries
          HttpStatus { code } => code >= 500 && i < retries
          ParseError(_) => false
        }
        if (!shouldRetry) return result
        await new Promise(r => setTimeout(r, 200 * (i + 1)))
      }
    }
  }
  return Err(NetworkError({ message: 'Exhausted retries' }))
}

type HttpClient {
  get<T>(url: string, headers?: Record<string, string>): Promise<Result<T, HttpError>>
  post<T>(url: string, body: dynamic, headers?: Record<string, string>): Promise<Result<T, HttpError>>
}

function createClient(baseUrl: string, defaultHeaders?: Record<string, string>): HttpClient {
  const base = defaultHeaders ?? {}
  return {
    get<T>(url, headers) {
      const fullUrl = baseUrl + url
      const cfg = { ...DEFAULT_CONFIG, headers: { ...base, ...headers } }
      return withRetry(() => httpRequest<T>(fullUrl, cfg), cfg.retries)
    },
    post<T>(url, body, headers) {
      const fullUrl = baseUrl + url
      const cfg: RequestConfig = {
        ...DEFAULT_CONFIG,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...base, ...headers },
        body: JSON.stringify(body)
      }
      return withRetry(() => httpRequest<T>(fullUrl, cfg), cfg.retries)
    }
  }
}

function describeError(e: HttpError): string {
  match e {
    NetworkError { message } => `Network: ${message}`
    HttpStatus { code, message } => `HTTP ${code}: ${message}`
    Timeout { afterMs } => `Timeout after ${afterMs}ms`
    ParseError { message } => `Parse error: ${message}`
  }
}

type Todo { id: number; title: string; completed: boolean }

async function main(): Promise<void> {
  const client = createClient('https://jsonplaceholder.typicode.com')

  const result = await client.get<Todo>('/todos/1')
  match result {
    Ok(todo) => console.log(`Todo: ${todo.title} (done: ${todo.completed})`)
    Err(e) => console.error(describeError(e))
  }

  const todos = await client.get<Todo[]>('/todos?_limit=3')
  match todos {
    Ok(list) => console.log(`Got ${list.length} todos`)
    Err(e) => console.error(describeError(e))
  }
}

main().catch(console.error)
