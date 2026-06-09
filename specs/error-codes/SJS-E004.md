# SJS-E004 — `any` is not a valid type in SJS

**Severity:** error  
**Category:** type-check  
**Stage:** Stage 1

## Description

The TypeScript `any` type does not exist in SJS. It is a silent unsafety escape hatch that defeats
the entire type system. SJS provides two typed alternatives:

- `unknown` — the value has an unknown type; must be narrowed before use.
- `dynamic` — opts a value out of type checking entirely, for JS interop only.

## Example

```sjs
// ✗ error
function process(data: any) {    // SJS-E004
  return data.value
}
```

## Fix

Use `unknown` when the type is genuinely not known but should be narrowed:

```sjs
// ✓ correct — unknown, narrow before use
function process(data: unknown): string {
  if (typeof data === "object" && data !== null && "value" in data) {
    return String((data as { value: unknown }).value)
  }
  return ""
}
```

Use `dynamic` only at JS interop boundaries:

```sjs
// ✓ correct — dynamic for third-party lib interop
const raw: dynamic = legacyLib.getData()
if (typeof raw === "string") {
  console.log(raw.toUpperCase())
}
```

## Related codes

- `SJS-W001` — implicit `dynamic` propagation
- `SJS-L001` — `dynamic` used without narrowing
