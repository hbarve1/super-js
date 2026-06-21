---
title: 'SJS-E019 — Unknown JSX element type — identifier not in scope or not a valid component'
description: 'SJS-E019 diagnostic reference'
sidebar_position: 99
section: error-codes
error_code: 'SJS-E019'
---


**Severity:** error  
**Category:** jsx  
**Stage:** Stage 2

## Description

When SJS processes a JSX expression such as `<Foo />`, it resolves `Foo` as a regular identifier
in the current scope. If `Foo` is not imported, not declared in the current file, or does not
have a type compatible with a JSX component (a function returning JSX, or a class with a
`render` method returning JSX), the compiler raises this error.

Lowercase JSX tags (e.g. `<div>`) are treated as intrinsic HTML elements and are always valid.
Capitalised tags must refer to a component that is in scope.

## Example

```sjs
// ✗ error — Foo is never imported or declared
function App(): JSX.Element {
  return <Foo title="hello" />   // SJS-E019
}
```

```sjs
// ✗ error — Button is used before it is imported
function Page(): JSX.Element {
  return <Button label="click" />   // SJS-E019
}
```

## Fix

Import or declare the component before using it:

```sjs
// ✓ correct
import { Button } from "./Button.sjs"

function Page(): JSX.Element {
  return <Button label="click" />
}
```

Or define the component in the same file:

```sjs
// ✓ correct — local component
function Foo(props: { title: string }): JSX.Element {
  return <h1>{props.title}</h1>
}

function App(): JSX.Element {
  return <Foo title="hello" />
}
```

## Related codes

- `SJS-E001` — null or undefined assigned to non-nullable type (applies to JSX prop types too)
- `SJS-E014` — private or protected member not accessible from this scope
