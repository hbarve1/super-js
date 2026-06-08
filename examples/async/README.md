# Async

Asynchronous programming patterns in SJS.

## Files (reading order)

| File | Demonstrates |
|------|-------------|
| `01-promises.sjs` | Promise creation, chaining, allSettled, race/timeout |
| `02-async-await.sjs` | async/await with Result<T,E> error handling |
| `03-error-handling.sjs` | Custom FetchError sum type, retry, combinators |
| `04-concurrent.sjs` | Concurrency limiting, async generators, allSettled |

## SJS Async Idiom

```sjs
// Prefer Result<T,E> over throw for async errors
async function fetchUser(id: number): Promise<Result<User, string>> {
  try {
    const res = await fetch(`/users/${id}`)
    if (!res.ok) return Err(`HTTP ${res.status}`)
    return Ok(await res.json())
  } catch (e) {
    return Err(String(e))
  }
}

// Handle at call site with match
const result = await fetchUser(1)
match result {
  Ok(user) => console.log(user.name)
  Err(message) => console.error('Failed:', message)
}
```

## Key Patterns

- **Result wrapping**: wrap all fallible async ops in `Result<T,E>`, never throw
- **match at call site**: exhaustive handling of Ok/Err at the consumption point
- **concurrency limit**: avoid overwhelming servers with `withConcurrencyLimit`
- **async generators**: use `async function*` + `for await` for streaming
