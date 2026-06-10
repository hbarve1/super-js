# Real-World Examples

Practical SJS programs demonstrating production patterns.

## Files

| File | Demonstrates |
|------|-------------|
| `task-manager.sjs` | CRUD + fs persistence + sum type errors + match |
| `http-client.sjs` | fetch wrapper, retry, timeout, Result<T,HttpError> |
| `config-loader.sjs` | File parsing, env overrides, validation errors |

## Key Patterns

```sjs
// All errors are sum types
type FetchError = | NetworkError { message: string } | Timeout { afterMs: number }

// All fallible ops return Result<T,E>
async function load(path: string): Promise<Result<Config, ConfigError>> { ... }

// Exhaustive handling at call site
match result {
  Ok(config) => start(config)
  Err(e) => { console.error(describeError(e)); process.exit(1) }
}
```

## Running

These examples require Node.js:
```bash
cd prototype
npx ts-node examples/real-world/task-manager.sjs
```

(The SJS prototype compiles `.sjs` files; if your preprocessor supports it,
use `superjs run examples/real-world/task-manager.sjs` instead.)
