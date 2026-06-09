# SJS-L003 — Use `===` / `!==` — `==` / `!=` performs type coercion

**Severity:** warning  
**Category:** lint  
**Stage:** Stage 3

## Description

The abstract equality operators `==` and `!=` perform type coercion before comparison, producing
results that are frequently surprising:

- `"" == false` → `true`
- `0 == false` → `true`
- `null == undefined` → `true`
- `" \t\n" == 0` → `true`

The strict equality operators `===` and `!==` never coerce: two values are strictly equal only
if they have the same type and the same value.

**Special case — `x == null` guard:** The pattern `x == null` (or `x != null`) is a common
idiom that tests for both `null` and `undefined` in one expression. SJS flags it all the same,
because nullable types (`T?`) should be narrowed explicitly. Replace the idiom with
`x === null || x === undefined`, or leverage the type system to handle nullability directly.

## Example

```sjs
// ✗ lint warning
if (score == 0) { ... }           // SJS-L003
if (input != "") { ... }          // SJS-L003
const isEmpty = arr.length == 0   // SJS-L003

function check(value: string?) {
  if (value == null) { ... }      // SJS-L003 — use explicit null/undefined check
}
```

## Fix

Replace `==` with `===` and `!=` with `!==`. For the null-guard idiom, expand the check:

```sjs
// ✓ correct
if (score === 0) { ... }
if (input !== "") { ... }
const isEmpty = arr.length === 0

function check(value: string?) {
  if (value === null || value === undefined) { ... }
  // or, using the nullable type directly:
  if (value === null) { ... }
}
```

## Auto-fix

This diagnostic is **auto-fixable**. Running `superjs fix` replaces `==` with `===` and `!=`
with `!==` at every flagged site. The `x == null` idiom is expanded to
`x === null || x === undefined`.

## Configuration

Configurable in `superjs.config.json`:

```json
{
  "lint": {
    "L003": "error" | "warn" | "off"
  }
}
```

Default: `"warn"` in standard mode, `"error"` in `--strict` mode.

## Related codes

- `SJS-E001` — null or undefined assigned to non-nullable type
- `SJS-E003` — property access on possibly-null value
