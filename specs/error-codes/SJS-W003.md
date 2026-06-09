# SJS-W003 — Unreachable `match` arm — earlier arm already covers this variant

**Severity:** warning  
**Category:** Match  
**Stage:** Stage 1

## Description

Inside a `match` expression, arms are tested in source order and the first matching arm wins.
If an arm's pattern is a subset of — or identical to — a pattern that appears earlier in the
same `match` block, the later arm can never be reached at runtime.

SJS reports this warning on the dominated (shadowed) arm so the developer can either remove
the dead arm or reorder the arms so that the more-specific pattern comes first.

## Example

```sjs
// ✗ warning
type Shape = Circle | Square | Triangle

function describe(s: Shape): string {
  return match s {
    Circle  => "circle",
    _       => "other",        // covers everything below
    Square  => "square",       // SJS-W003 — already covered by `_` above
    Triangle => "triangle",    // SJS-W003 — already covered by `_` above
  }
}
```

Wildcard and variable patterns (`_`, `x`) subsume every subsequent arm.
Literal or variant patterns dominate any arm whose pattern is identical.

## Suppression / Fix

Move more-specific arms before broader patterns, or remove the dead arm entirely:

```sjs
// ✓ correct — specific arms first, wildcard last
function describe(s: Shape): string {
  return match s {
    Circle   => "circle",
    Square   => "square",
    Triangle => "triangle",
    _        => "other",
  }
}
```

## Related codes

- `SJS-E009` — non-exhaustive `match` — missing variant(s)
- `SJS-W009` — unreachable code following a terminator statement
