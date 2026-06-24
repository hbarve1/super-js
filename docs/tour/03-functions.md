---
title: 03 — Functions
sidebar_position: 4
description: Named functions, arrows, parameters, and return types.
section: tour
---

# Functions

**Goal:** Write typed functions with clear signatures.

Arrow functions and `function` declarations both accept parameter and return types.

## Example

```sjs
function add(a: number, b: number): number {
  return a + b
}

const double = (n: number): number => n * 2

export function greet(name: string): string {
  return "hi " + name
}
```

[Open in playground](https://superjs.org/playground#code=ZnVuY3Rpb24gYWRkKGE6IG51bWJlciwgYjogbnVtYmVyKTogbnVtYmVyIHsKICByZXR1cm4gYSArIGIKfQoKY29uc3QgZG91YmxlID0gKG46IG51bWJlcik6IG51bWJlciA9PiBuICogMgoKZXhwb3J0IGZ1bmN0aW9uIGdyZWV0KG5hbWU6IHN0cmluZyk6IHN0cmluZyB7CiAgcmV0dXJuICJoaSAiICsgbmFtZQp9)

## Key takeaways

- Return types are checked at every `return`.
- Exported functions form your module API.
- Prefer explicit returns on public functions.

**Next:** [Control flow](./04-control-flow.md)
