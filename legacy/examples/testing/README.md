# Testing

Examples showing how to test SJS code using the `Result<T,E>` pattern — no test framework required.

## Files

| File | Description |
|------|-------------|
| `01-basic.test.sjs` | Synchronous `Result<T,E>` tests with `assertOk` / `assertErr` helpers |
| `02-async.test.sjs` | Async `Promise<Result<T,E>>` tests with `match` on the resolved value |

## Result<T,E> testing pattern

Instead of `try/catch`, SJS functions return `Result<T,E>`. Test helpers unwrap the result or throw a descriptive error:

```sjs
function assertOk<T, E>(r: Result<T, E>, label: string): T {
  return match r {
    Ok(v) => v
    Err(e) => { throw new Error(label + " expected Ok, got Err: " + e) }
  }
}
```

This keeps test assertions explicit and removes the need for bare `try/catch` blocks.

## Running the examples

```bash
superjs build --source testing/01-basic.test.sjs --outDir /tmp/out && node /tmp/out/01-basic.test.js
superjs build --source testing/02-async.test.sjs --outDir /tmp/out && node /tmp/out/02-async.test.js
```
