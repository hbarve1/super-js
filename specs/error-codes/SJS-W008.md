# SJS-W008 — Implicit switch fallthrough between non-empty case clauses

**Severity:** warning  
**Category:** Control flow  
**Stage:** Stage 1

## Description

JavaScript's `switch` statement falls through from one `case` clause to the next unless a
`break`, `return`, `throw`, or `continue` terminates the clause. Unintentional fallthrough is
a frequent source of bugs. SJS emits this warning when a non-empty `case` clause (one that
contains at least one statement) ends without an explicit terminator and execution would
implicitly fall into the next clause.

Empty case clauses (used to share a body between multiple values) are exempt, as that pattern
is idiomatic and intentional:

```sjs
case "a":
case "b":
  handle()   // intentional grouping — no warning
  break
```

## Example

```sjs
// ✗ warning
function grade(score: number): string {
  let label = ""
  switch (score) {
    case 5:
      label = "excellent"       // SJS-W008 — falls through to case 4
    case 4:
      label = "good"
      break
    case 3:
      label = "average"         // SJS-W008 — falls through to default
    default:
      label = "unknown"
  }
  return label
}
```

## Suppression / Fix

Add an explicit terminator at the end of every non-empty case clause:

```sjs
// ✓ correct
function grade(score: number): string {
  switch (score) {
    case 5:
      return "excellent"
    case 4:
      return "good"
    case 3:
      return "average"
    default:
      return "unknown"
  }
}
```

If the fallthrough is intentional (rare), annotate it with a `// fallthrough` comment
immediately before the next `case` to suppress the warning:

```sjs
// ✓ correct — intentional fallthrough documented
switch (phase) {
  case "init":
    setup()
    // fallthrough
  case "run":
    execute()
    break
}
```

## Related codes

- `SJS-W009` — unreachable code following a terminator statement
- `SJS-E008` — `break` used outside of a loop or switch
