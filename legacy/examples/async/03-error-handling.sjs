// Async Error Handling in SJS
// Idiomatic: wrap async ops in Result<T,E>, propagate via match

type Result<T, E> = | Ok(T) | Err(E)

// Custom error sum type
type FetchError =
  | NetworkError { message: string }
  | ParseError { message: string }
  | NotFound { url: string }
  | Unauthorized

async function safeFetch(url: string): Promise<Result<string, FetchError>> {
  try {
    const res = await fetch(url)
    if (res.status === 404) return Err(NotFound({ url }))
    if (res.status === 401) return Err(Unauthorized())
    if (!res.ok) return Err(NetworkError({ message: `HTTP ${res.status}` }))
    try {
      const text = await res.text()
      return Ok(text)
    } catch (e) {
      return Err(ParseError({ message: String(e) }))
    }
  } catch (e) {
    return Err(NetworkError({ message: String(e) }))
  }
}

function describeError(err: FetchError): string {
  match err {
    NetworkError { message } => `Network error: ${message}`
    ParseError { message } => `Parse error: ${message}`
    NotFound { url } => `Not found: ${url}`
    Unauthorized => 'Authentication required'
  }
}

// Result combinators
function mapResult<T, U, E>(r: Result<T, E>, f: (t: T) => U): Result<U, E> {
  match r {
    Ok(v) => Ok(f(v))
    Err(e) => Err(e)
  }
}

async function flatMapAsync<T, U, E>(
  r: Result<T, E>,
  f: (t: T) => Promise<Result<U, E>>
): Promise<Result<U, E>> {
  match r {
    Ok(v) => f(v)
    Err(e) => Promise.resolve(Err(e))
  }
}

// Retry with Result — run at least one attempt, then retry on Err
async function withRetry<T, E>(
  op: () => Promise<Result<T, E>>,
  maxAttempts: number
): Promise<Result<T, E>> {
  let last = await op()
  for (let i = 1; i < maxAttempts; i++) {
    match last {
      Ok(_) => return last
      Err(_) => {
        await new Promise(r => setTimeout(r, 100 * i))
        last = await op()
      }
    }
  }
  return last
}

async function main(): Promise<void> {
  const result = await safeFetch('https://jsonplaceholder.typicode.com/todos/1')
  match result {
    Ok(text) => console.log('Data length:', text.length)
    Err(err) => console.error(describeError(err))
  }

  const withRetried = await withRetry(
    () => safeFetch('https://jsonplaceholder.typicode.com/todos/2'),
    3
  )
  match withRetried {
    Ok(text) => console.log('Retry success, length:', text.length)
    Err(err) => console.error('All retries failed:', describeError(err))
  }
}

main().catch(console.error)
