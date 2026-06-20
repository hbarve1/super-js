# SJS-L016 — Unhandled `Result`

**Severity:** warning  
**Category:** lint  
**Stage:** Stage 3

## Description

A `Result<T, E>` value is used as a standalone statement without being matched, returned,
assigned, or otherwise consumed. SJS treats `Result` as the canonical error channel (RFC-0004);
ignoring it defeats exhaustiveness and error handling.

This rule is type-aware: only expressions whose type is `Result<…>` are flagged.

## Example

```sjs
type Result<T, E> = Ok(T) | Err(E)

// ✗ lint warning
export function run(): void {
  divide(10, 0)   // SJS-L016 — Result discarded
}
```

## Fix

Match, return, or bind the result:

```sjs
// ✓ correct
export function run(): void {
  const r = divide(10, 0)
  match r {
    Ok(v) => console.log(v),
    Err(e) => console.error(e),
  }
}
```

## Configuration

```json
{
  "lint": {
    "L016": "error" | "warn" | "off"
  }
}
```

Default: `"warn"` in standard mode, `"error"` in `--strict` mode.

## Related codes

- `SJS-L017` — prefer `Result` over `throw`
- `SJS-E007` — non-exhaustive `match`
