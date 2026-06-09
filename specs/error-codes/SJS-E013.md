# SJS-E013 — `with` statement not allowed (SJS is always strict mode)

**Severity:** error  
**Category:** control-flow  
**Stage:** Stage 1

## Description

SJS always runs in strict mode. The `with` statement is unconditionally banned by the ECMAScript
strict mode specification (ECMA-262 §13.11). `with` alters the scope chain at runtime in ways
that cannot be statically analysed, making type-checking and tooling impossible.

The parser rejects any `with` statement before type-checking begins.

## Example

```sjs
// ✗ error
const obj = { x: 1, y: 2 }

with (obj) {    // SJS-E013
  console.log(x + y)
}
```

## Fix

Access properties explicitly:

```sjs
// ✓ correct
const obj = { x: 1, y: 2 }
console.log(obj.x + obj.y)
```

Or destructure when many members are needed in a local block:

```sjs
// ✓ correct — destructure
const { x, y } = obj
console.log(x + y)
```

## Related codes

- `SJS-E012` — `namespace` is also banned for similar static-analysis reasons
