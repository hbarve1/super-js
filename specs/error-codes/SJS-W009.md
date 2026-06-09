# SJS-W009 — Unreachable code following a terminator statement

**Severity:** warning  
**Category:** Control flow  
**Stage:** Stage 1

## Description

A `return`, `throw`, `break`, or `continue` statement unconditionally transfers control away
from the current block. Any statement in the same block that follows one of these terminators
will never execute at runtime. SJS reports each such unreachable statement to help developers
catch dead code, misplaced logic, or early-return bugs.

The warning is anchored to the first unreachable statement; subsequent unreachable statements
in the same block are also warned but do not cascade into nested blocks.

## Example

```sjs
// ✗ warning
function clamp(n: number, min: number, max: number): number {
  if (n < min) {
    return min
    console.log("clamped low")   // SJS-W009 — after return
  }
  return Math.min(n, max)
  return max                     // SJS-W009 — after return
}
```

```sjs
// ✗ warning
for (let i = 0; i < 10; i++) {
  if (i === 5) {
    break
    i++                          // SJS-W009 — after break
  }
}
```

## Suppression / Fix

Remove or relocate the unreachable statement:

```sjs
// ✓ correct
function clamp(n: number, min: number, max: number): number {
  if (n < min) {
    console.log("clamped low")
    return min
  }
  return Math.min(n, max)
}
```

If the statement was intended as a debugging guard that should only run conditionally, wrap
it in its own `if` block instead of placing it after the terminator.

## Related codes

- `SJS-W003` — unreachable `match` arm covered by an earlier arm
- `SJS-W008` — implicit switch fallthrough between non-empty case clauses
