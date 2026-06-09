# SJS-W004 — Reserved or future SJS keyword used as an identifier

**Severity:** warning  
**Category:** Keywords  
**Stage:** Stage 1

## Description

SJS reserves a set of identifiers for current or planned language features. Using one of these
reserved words as a variable name, function name, parameter name, or property name is
syntactically accepted today, but will become a parse error in a future SJS version when the
keyword is activated.

Reserved / future keywords that trigger this warning include (non-exhaustive):

`where`, `effect`, `region`, `struct`, `opaque`, `macro`, `trait`, `impl`, `yield` (outside
generator context), `async` (outside async context), `await` (outside async context).

## Example

```sjs
// ✗ warning
let where = "home"             // SJS-W004 — `where` is a reserved SJS keyword
function struct() { }          // SJS-W004 — `struct` is a reserved SJS keyword

const effect = () => console.log("side effect")  // SJS-W004
```

## Suppression / Fix

Rename the identifier to a non-reserved name:

```sjs
// ✓ correct
let location = "home"
function buildStruct() { }

const runEffect = () => console.log("side effect")
```

If the identifier is a property key in an object literal (not a binding), the warning is
suppressed because property keys are not evaluated as keyword tokens:

```sjs
// ✓ correct — property key, not a binding
const config = { where: "home" }
```

## Related codes

- `SJS-E008` — use of a currently-active reserved keyword in an invalid position
