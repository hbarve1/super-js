---
title: 'SJS-W007 — Missing `key` prop on JSX element in a list or iterator context'
description: 'SJS-W007 diagnostic reference'
sidebar_position: 99
section: error-codes
error_code: 'SJS-W007'
---


**Severity:** warning  
**Category:** JSX  
**Stage:** Stage 1

## Description

When JSX elements are produced inside an array literal, a `.map()` / `.flatMap()` call, or any
other iterator/loop context, each element must carry a stable, unique `key` prop so the runtime
reconciler can track identity across renders. Omitting `key` degrades reconciliation performance
and can cause incorrect state retention or visual glitches.

SJS detects this at compile time by inspecting the expression context in which a JSX element
appears: if the nearest enclosing expression is an array literal, the callback of a known array
iterator method, or a `for`/`while` loop body that accumulates elements, and the element has no
`key` attribute, SJS-W007 is emitted on the opening tag.

## Example

```sjs
// ✗ warning
function List({ items }: { items: string[] }): JSX.Element {
  return (
    <ul>
      {items.map(item => (
        <li>{item}</li>    // SJS-W007 — no `key` prop
      ))}
    </ul>
  )
}
```

```sjs
// ✗ warning
const nodes = [
  <div>A</div>,           // SJS-W007
  <div>B</div>,           // SJS-W007
]
```

## Suppression / Fix

Add a unique, stable `key` prop to every JSX element produced in a list context:

```sjs
// ✓ correct
function List({ items }: { items: string[] }): JSX.Element {
  return (
    <ul>
      {items.map(item => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}
```

The `key` value must be a string or number that is stable across re-renders for the same
logical item. Avoid using array indices as keys when the list can be reordered or filtered.

```sjs
// ✓ correct — index as key only when list is static and never reordered
{items.map((item, i) => <li key={i}>{item}</li>)}
```

## Related codes

- `SJS-E012` — invalid JSX expression type
