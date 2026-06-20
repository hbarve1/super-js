# SJS-L010 — Import out of order

**Severity:** warning  
**Category:** lint  
**Stage:** Stage 3

## Description

Within a contiguous block of `import` statements, source specifiers must be sorted in ascending
lexicographic order. Consistent ordering makes diffs easier to read and matches common formatter
conventions.

A blank line or non-import statement ends the block; the next import starts a new sorted block.

## Example

```sjs
// ✗ lint warning — "b" should come before "z"
import { z } from "z"
import { a } from "a"   // SJS-L010
```

## Fix

Reorder imports ascending by module specifier:

```sjs
// ✓ correct
import { a } from "a"
import { z } from "z"
```

## Configuration

```json
{
  "lint": {
    "L010": "error" | "warn" | "off"
  }
}
```

Default: `"warn"` in standard mode, `"error"` in `--strict` mode.

## Related codes

- `SJS-L009` — unused import
