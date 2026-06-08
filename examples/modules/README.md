# Modules

Examples showing how to structure SJS code as reusable exported modules — generic data structures and async HTTP utilities.

## Files

| File | Description |
|------|-------------|
| `collections.sjs` | Generic `Stack<T>` and `Queue<T>` with a shared `Collection<T>` interface |
| `http.sjs` | Async HTTP `get<T>` helper returning `Promise<Result<T, HttpError>>` |

## Key patterns

- `collections.sjs` uses private fields (`#items`) and `T | undefined` for pop/dequeue return types (matching JS array runtime semantics)
- `http.sjs` never throws for HTTP errors — every failure path returns `Err(...)` so callers can `match` exhaustively
- `catch (e: dynamic)` is the correct SJS spelling for caught exceptions

## Running the examples

These files are intended to be imported. To exercise `collections.sjs` inline:

```bash
superjs build --source modules/collections.sjs --outDir /tmp/out && node /tmp/out/collections.js
```

To use in a consumer file:

```sjs
import { Stack, Queue } from './collections'
import { get, HttpError } from './http'
```
