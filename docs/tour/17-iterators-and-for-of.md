---
title: 17 — Iterators and for...of
sidebar_position: 18
description: Iterate collections with for...of.
section: tour
---

# Iterators and for...of

**Goal:** Loop over arrays and iterable values.

Standard `for...of` works on arrays and other iterables.

## Example

```sjs
function sum(nums: number[]): number {
  let total: number = 0
  for (const n of nums) {
    total = total + n
  }
  return total
}

const values: number[] = [1, 2, 3]
console.log(sum(values))
```

[Open in playground](https://superjs.org/playground#code=ZnVuY3Rpb24gc3VtKG51bXM6IG51bWJlcltdKTogbnVtYmVyIHsKICBsZXQgdG90YWw6IG51bWJlciA9IDAKICBmb3IgKGNvbnN0IG4gb2YgbnVtcykgewogICAgdG90YWwgPSB0b3RhbCArIG4KICB9CiAgcmV0dXJuIHRvdGFsCn0KCmNvbnN0IHZhbHVlczogbnVtYmVyW10gPSBbMSwgMiwgM10KY29uc29sZS5sb2coc3VtKHZhbHVlcykp)

## Key takeaways

- Loop variables are inferred from the iterable element type.
- Use `@superjs/std-collections` `List` for functional helpers.
- Generators follow ECMAScript rules.

**Next:** [Serverless handlers](./18-serverless-handlers.md)
