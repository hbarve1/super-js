---
title: 'SJS-W006 — Excess property on a fresh object literal assigned to a typed position'
description: 'SJS-W006 diagnostic reference'
sidebar_position: 99
section: error-codes
error_code: 'SJS-W006'
---


**Severity:** warning  
**Category:** Object types  
**Stage:** Stage 1

## Description

When a freshly-created object literal is assigned directly to a variable or parameter whose
type annotation does not include a particular property, the extra property is almost certainly
a typo or a misunderstanding of the target type. SJS emits this warning — rather than a hard
error — because the assignment is structurally valid (the required properties are present), but
the excess property will be silently discarded, which is usually unintentional.

This check applies only to **fresh object literals** at the point of assignment. It does not
apply when a previously-bound variable of a wider type is assigned to a narrower type.

## Example

```sjs
// ✗ warning
type Point = { x: number; y: number }

let p: Point = { x: 1, y: 2, z: 3 }   // SJS-W006 — `z` is excess
```

```sjs
// ✗ warning
function move(p: Point): void { }

move({ x: 0, y: 0, label: "origin" })  // SJS-W006 — `label` is excess
```

## Suppression / Fix

Remove the excess property from the literal:

```sjs
// ✓ correct
let p: Point = { x: 1, y: 2 }
```

If the target type should include the property, update the type annotation:

```sjs
// ✓ correct — extend the type
type Point3D = { x: number; y: number; z: number }
let p: Point3D = { x: 1, y: 2, z: 3 }
```

If you need to temporarily widen the value, assign it to a variable first so it is no longer
a fresh literal at the assignment site:

```sjs
// ✓ correct — passes through a wider intermediate binding
const raw = { x: 1, y: 2, z: 3 }
let p: Point = raw    // no warning — raw is not a fresh literal here
```

## Related codes

- `SJS-E002` — missing required property on object type
- `SJS-E005` — property type mismatch
