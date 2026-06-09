# SJS-E017 — Circular import detected — module graph contains a cycle

**Severity:** error  
**Category:** modules  
**Stage:** Stage 1

## Description

SJS performs a static analysis of the module dependency graph during compilation. If two or more
modules form an import cycle (A imports B and B imports A, directly or transitively), the
compiler raises this error.

Circular imports are banned because:

1. They cause unpredictable initialisation order — some module's exports may be `undefined` at
   the point they are consumed.
2. They indicate that responsibilities are not properly separated between modules.

The error is reported on the `import` statement that closes the cycle.

## Example

```sjs
// ✗ error — a.sjs
import { bar } from "./b.sjs"   // SJS-E017 — closes the cycle

export function foo(): string { return bar() }
```

```sjs
// ✗ error — b.sjs
import { foo } from "./a.sjs"

export function bar(): string { return foo() }
```

## Fix

Break the cycle by extracting shared logic into a third module that neither of the original
modules imports back:

```sjs
// ✓ correct — shared.sjs (no imports from a or b)
export function shared(): string { return "hello" }
```

```sjs
// ✓ correct — a.sjs
import { shared } from "./shared.sjs"
export function foo(): string { return shared() }
```

```sjs
// ✓ correct — b.sjs
import { shared } from "./shared.sjs"
export function bar(): string { return shared() }
```

## Related codes

- `SJS-E012` — `namespace` is banned; use ES module imports instead
- `SJS-E018` — top-level `await` used outside an ES module context
