---
title: 'SJS-L004 — Prefer `for…of` over `for…in` for array and iterable iteration'
description: 'SJS-L004 diagnostic reference'
sidebar_position: 99
section: error-codes
error_code: 'SJS-L004'
---


**Severity:** warning  
**Category:** lint  
**Stage:** Stage 3

## Description

`for…in` iterates over all **enumerable string keys** of an object, including inherited ones from
the prototype chain. When used on arrays or other iterables the keys are the index strings
(`"0"`, `"1"`, …), not the values, and any enumerable properties added to `Array.prototype` will
also appear. This is almost never the intent.

`for…of` iterates over the **values** yielded by an object's `[Symbol.iterator]`, which is the
correct and safe choice for arrays, strings, `Set`, `Map`, generator results, and any other
iterable.

Use `for…in` only when you genuinely need the enumerable property keys of a plain object — and
even then, combine it with `Object.hasOwn()` to skip inherited keys.

The lint pass flags `for…in` whenever the operand's static type is an array type (`T[]`) or any
other iterable (i.e., implements `Iterable<T>`). Plain objects (`{ [key: string]: T }`) are
exempt.

## Example

```sjs
// ✗ lint warning
const nums: number[] = [1, 2, 3]
for (const i in nums) {           // SJS-L004 — i is "0", "1", "2", not 1, 2, 3
  console.log(nums[i])
}

for (const ch in "hello") {       // SJS-L004 — string is iterable, use for…of
  process(ch)
}
```

## Fix

Replace `for…in` with `for…of` to iterate values directly:

```sjs
// ✓ correct
const nums: number[] = [1, 2, 3]
for (const n of nums) {
  console.log(n)
}

for (const ch of "hello") {
  process(ch)
}
```

If you need the index as well, use `Array.prototype.entries()`:

```sjs
// ✓ correct — index + value
for (const [i, n] of nums.entries()) {
  console.log(i, n)
}
```

`for…in` on a plain object remains acceptable:

```sjs
// ✓ correct — plain object key iteration
const config: { [key: string]: string } = { a: "1", b: "2" }
for (const key in config) {
  if (Object.hasOwn(config, key)) {
    console.log(key, config[key])
  }
}
```

## Configuration

Configurable in `superjs.config.json`:

```json
{
  "lint": {
    "L004": "error" | "warn" | "off"
  }
}
```

Default: `"warn"` in standard mode, `"error"` in `--strict` mode.

## Related codes

- `SJS-L001` — prefer `const` over `let` when a binding is never reassigned
- `SJS-L002` — prefer `let` or `const` over `var`
