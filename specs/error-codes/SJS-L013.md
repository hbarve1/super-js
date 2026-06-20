# SJS-L013 — Explicit `dynamic` type annotation

**Severity:** warning  
**Category:** lint  
**Stage:** Stage 3

## Description

An explicit `dynamic` annotation opts out of static checking for that binding. SJS allows
`dynamic` at boundaries (npm interop, JSON parsing) but flags it so unsafety stays visible.

Add `// @sjs:dynamic-ok` on the same line or the line above to document intentional use.

## Example

```sjs
// ✗ lint warning
export const data: dynamic = load()   // SJS-L013
```

## Fix

Prefer a precise type when possible, or opt out explicitly:

```sjs
// ✓ correct — boundary with documented escape hatch
// @sjs:dynamic-ok
export const data: dynamic = load()

// ✓ better — typed when you have a schema
export const data: User = parseUser(load())
```

## Configuration

```json
{
  "lint": {
    "L013": "error" | "warn" | "off"
  }
}
```

Default: `"warn"` in standard mode, `"error"` in `--strict` mode.

## Related codes

- `SJS-W001` — implicit `dynamic` in strict mode
