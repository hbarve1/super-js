# SJS-L009 — Unused import

**Severity:** warning  
**Category:** lint  
**Stage:** Stage 3

## Description

An import binding is never referenced in the module (value, type, or JSX position). Unused imports
add noise and can hide dead dependencies.

Namespace imports (`import * as ns`) are only flagged when nothing from `ns` is used.

## Example

```sjs
// ✗ lint warning — foo is never used
import { foo, bar } from "./m"   // SJS-L009 on foo
bar()
```

## Fix

Remove the unused binding or use it:

```sjs
// ✓ correct
import { bar } from "./m"
bar()
```

## Configuration

```json
{
  "lint": {
    "L009": "error" | "warn" | "off"
  }
}
```

Default: `"warn"` in standard mode, `"error"` in `--strict` mode.

## Related codes

- `SJS-L012` — unused top-level declaration
