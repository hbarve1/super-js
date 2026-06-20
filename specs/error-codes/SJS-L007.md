# SJS-L007 — Redundant match arm

**Severity:** warning  
**Category:** lint  
**Stage:** Stage 3

## Description

A `match` arm repeats a variant tag that an earlier arm already handles. The later arm is
unreachable for that variant and usually indicates a copy-paste error or incomplete refactor.

## Example

```sjs
type Status = Active | Inactive

// ✗ lint warning — Active handled twice
const r = match s {
  Active => 1,
  Active => 2,    // SJS-L007
  Inactive => 0,
}
```

## Fix

Remove the duplicate arm or change it to the variant you intended:

```sjs
// ✓ correct
const r = match s {
  Active => 1,
  Inactive => 0,
}
```

## Configuration

```json
{
  "lint": {
    "L007": "error" | "warn" | "off"
  }
}
```

Default: `"warn"` in standard mode, `"error"` in `--strict` mode.

## Related codes

- `SJS-L006` — empty `match` expression
- `SJS-E007` — non-exhaustive `match` (missing variants)
