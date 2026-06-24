---
title: 08 — Object types
sidebar_position: 9
description: Structural object types with type { } — no interface keyword.
section: tour
---

# Object types

**Goal:** Declare object shapes with the `type` brace form.

SJS uses `type Name { ... }` for structural types. Conformance is checked structurally — no `implements` keyword.

## Example

```sjs
type Point {
  x: number;
  y: number;
}

type Named {
  name: string;
}

type Place extends Named {
  city: string;
}

function label(p: Place): string {
  return p.name + " @ " + p.city
}
```

[Open in playground](https://superjs.org/playground#code=dHlwZSBQb2ludCB7CiAgeDogbnVtYmVyOwogIHk6IG51bWJlcjsKfQoKdHlwZSBOYW1lZCB7CiAgbmFtZTogc3RyaW5nOwp9Cgp0eXBlIFBsYWNlIGV4dGVuZHMgTmFtZWQgewogIGNpdHk6IHN0cmluZzsKfQoKZnVuY3Rpb24gbGFiZWwocDogUGxhY2UpOiBzdHJpbmcgewogIHJldHVybiBwLm5hbWUgKyAiIEAgIiArIHAuY2l0eQp9)

## Key takeaways

- Members end with semicolons.
- `extends` composes object types.
- Classes satisfy object types implicitly.

**Next:** [Generics](./09-generics.md)
