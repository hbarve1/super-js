---
title: 'SJS-W005 — Explicit `public` modifier is redundant — class members are public by default'
description: 'SJS-W005 diagnostic reference'
sidebar_position: 99
section: error-codes
error_code: 'SJS-W005'
---


**Severity:** warning  
**Category:** Access modifiers  
**Stage:** Stage 1

## Description

In SJS, class members (methods and properties) are `public` by default. Writing `public`
explicitly does not change behaviour; it is dead annotation noise that adds visual clutter
without conveying any information. This warning nudges developers toward the idiomatic
style of omitting the redundant modifier.

The warning applies to instance methods, static methods, instance properties, and static
properties that carry an explicit `public` keyword.

## Example

```sjs
// ✗ warning
class Counter {
  public count: number = 0         // SJS-W005 — `public` is implicit
  public increment(): void {       // SJS-W005
    this.count++
  }
  public static create(): Counter { // SJS-W005
    return new Counter()
  }
}
```

## Suppression / Fix

Remove the redundant `public` keyword:

```sjs
// ✓ correct
class Counter {
  count: number = 0
  increment(): void {
    this.count++
  }
  static create(): Counter {
    return new Counter()
  }
}
```

Use `private` or `protected` only when you need to restrict visibility:

```sjs
// ✓ correct — non-public modifier is meaningful
class Counter {
  private _count: number = 0
  get count(): number { return this._count }
  increment(): void { this._count++ }
}
```

## Related codes

- `SJS-E007` — private member accessed from outside the class
