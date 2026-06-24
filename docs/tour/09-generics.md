---
title: 09 — Generics
sidebar_position: 10
description: Generic functions and type parameters.
section: tour
---

# Generics

**Goal:** Write reusable functions with type parameters.

Type parameters use angle brackets: `function id&lt;T&gt;(x: T): T`. No `extends` constraints on type parameters.

## Example

```sjs
function id<T>(value: T): T {
  return value
}

function first<T>(items: T[]): T? {
  if (items.length === 0) return null
  return items[0]
}

const n: number = id(42)
const s: string = id("ok")
```

[Open in playground](https://superjs.org/playground#code=ZnVuY3Rpb24gaWQ8VD4odmFsdWU6IFQpOiBUIHsKICByZXR1cm4gdmFsdWUKfQoKZnVuY3Rpb24gZmlyc3Q8VD4oaXRlbXM6IFRbXSk6IFQ_IHsKICBpZiAoaXRlbXMubGVuZ3RoID09PSAwKSByZXR1cm4gbnVsbAogIHJldHVybiBpdGVtc1swXQp9Cgpjb25zdCBuOiBudW1iZXIgPSBpZCg0MikKY29uc3Qgczogc3RyaW5nID0gaWQoIm9rIik)

## Key takeaways

- Generics monomorphize at compile time.
- Use structural object types for bounds, not `T extends U`.
- Type args can be inferred at call sites.

**Next:** [Classes](./10-classes.md)
