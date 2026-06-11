# @superjs/stdlib

SuperJS standard library. Written in SJS; compiles to typed JS.

**Status:** Stage 4 — planned. Not yet published.

## Planned modules

| Module | Purpose |
|--------|---------|
| `result` | `type Result<T,E> = Ok(T) \| Err(E)` with combinators |
| `option` | `type Option<T> = Some(T) \| None` with combinators |
| `iter` | Lazy iterator with `map`, `filter`, `take`, `collect` |
| `collections` | Typed `Map<K,V>`, `Set<T>`, `Queue<T>` |

## Usage (future)

```sjs
import { Ok, Err, type Result } from "@superjs/stdlib/result"

function divide(a: number, b: number): Result<number, string> {
  if (b === 0) return Err("division by zero")
  return Ok(a / b)
}
```
