# SJS-L017 — Prefer `Result` over `throw`

**Severity:** warning  
**Category:** lint  
**Stage:** Stage 3

## Description

A `throw` statement bypasses SJS's preferred error model. Recoverable failures should be returned
as `Result<T, E>` so callers handle them explicitly (RFC-0004).

`throw` remains valid for truly exceptional cases (programmer errors, unrecoverable state).

## Example

```sjs
// ✗ lint warning
export function parseId(raw: string): number {
  if (raw.length === 0) throw "empty"   // SJS-L017
  return Number(raw)
}
```

## Fix

Return `Result` and let callers `match`:

```sjs
type Result<T, E> = Ok(T) | Err(E)

export function parseId(raw: string): Result<number, string> {
  if (raw.length === 0) return Err("empty")
  return Ok(Number(raw))
}
```

## Configuration

```json
{
  "lint": {
    "L017": "error" | "warn" | "off"
  }
}
```

Default: `"warn"` in standard mode, `"error"` in `--strict` mode.

## Related codes

- `SJS-L016` — unhandled `Result`
- `SJS-E007` — non-exhaustive `match`
