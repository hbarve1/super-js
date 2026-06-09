# SJS-W001 — Implicit `dynamic` — unannotated position in `--strict` mode

**Severity:** warning  
**Category:** dynamic type  
**Stage:** Stage 0 (prototype)

## Description

In `--strict` mode, every function parameter, variable declaration, and return position must carry
an explicit type annotation. When an annotation is absent, SJS defaults the type to `dynamic` —
but does so silently. This warning makes the implicit `dynamic` visible so the developer can
either add a real annotation or write `dynamic` explicitly to signal the intent.

The warning is only emitted in `--strict` mode. In normal mode, unannotated positions are
inferred without a warning.

## Example

```sjs
// ✗ warning
function add(a, b) {       // SJS-W001 on `a` and `b`
  return a + b
}

let result = add(1, 2)     // SJS-W001 on `result` (return type inferred as dynamic)
```

## Suppression / Fix

Add explicit type annotations to every unannotated position:

```sjs
// ✓ correct
function add(a: number, b: number): number {
  return a + b
}

let result: number = add(1, 2)
```

If interop with untyped JS code genuinely requires a dynamic position, annotate it explicitly
so the warning is suppressed and the intent is documented:

```sjs
// ✓ correct — intentional dynamic
function wrap(value: dynamic): dynamic {
  return value
}
```

## Related codes

- `SJS-E004` — `any` is not a valid type in SJS; use `unknown` or `dynamic` instead
- `SJS-W002` — `dynamic` value assigned to a typed position without a narrowing check
