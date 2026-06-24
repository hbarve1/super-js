---
title: 07 — Sum types
sidebar_position: 8
description: Option, Result, and variant constructors.
section: tour
---

# Sum types

**Goal:** Model alternatives with tagged variants instead of booleans + fields.

Sum types compose: `type Result&lt;T, E&gt; = Ok(T) | Err(E)` (see `@superjs/std-core`).

## Example

```sjs
type Result<T, E> = Ok(T) | Err(E)

function divide(a: number, b: number): Result<number, string> {
  if (b === 0) return Err("divide by zero")
  return Ok(a / b)
}

function run(): void {
  const r: Result<number, string> = divide(10, 2)
  match r {
    Ok(n) => console.log(n),
    Err(e) => console.log(e),
  }
}
```

[Open in playground](https://superjs.org/playground#code=dHlwZSBSZXN1bHQ8VCwgRT4gPSBPayhUKSB8IEVycihFKQoKZnVuY3Rpb24gZGl2aWRlKGE6IG51bWJlciwgYjogbnVtYmVyKTogUmVzdWx0PG51bWJlciwgc3RyaW5nPiB7CiAgaWYgKGIgPT09IDApIHJldHVybiBFcnIoImRpdmlkZSBieSB6ZXJvIikKICByZXR1cm4gT2soYSAvIGIpCn0KCmZ1bmN0aW9uIHJ1bigpOiB2b2lkIHsKICBjb25zdCByOiBSZXN1bHQ8bnVtYmVyLCBzdHJpbmc-ID0gZGl2aWRlKDEwLCAyKQogIG1hdGNoIHIgewogICAgT2sobikgPT4gY29uc29sZS5sb2cobiksCiAgICBFcnIoZSkgPT4gY29uc29sZS5sb2coZSksCiAgfQp9)

## Key takeaways

- Variants carry payloads: `Some(42)`, `None`.
- Prefer `Result` over thrown exceptions for expected errors.
- Import helpers from `@superjs/std-core` in real projects.

**Next:** [Object types](./08-interfaces.md)
