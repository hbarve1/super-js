---
title: 'SJS-P004 — Invalid sum type declaration'
description: 'SJS-P004 diagnostic reference'
sidebar_position: 99
section: error-codes
error_code: 'SJS-P004'
---


**Severity:** error  
**Category:** parser  
**Stage:** Stage 1

## Description

A `type` declaration intended to define a sum type (discriminated union) contains syntax that
does not conform to the SJS sum-type grammar.

SJS sum types take the form:

```
type <Name>[<TypeParams>] = <Variant>(<Payload>) | <Variant>(<Payload>) | ...
```

where each variant is a capitalized identifier optionally followed by a parenthesised payload
list. SJS-P004 is emitted when the parser has successfully parsed `type <Name> =` and has
entered sum-type context, but the token sequence does not form valid variant declarations.

Common triggers:

- A variant name that starts with a lowercase letter (variant names must begin with an
  uppercase letter to be distinguishable from type aliases).
- Payload syntax that mixes positional and named fields inconsistently (either all positional
  `Ok(T, U)` or all named `Ok(value: T, message: string)`, not both in the same variant).
- Using `|` as the *first* token of the declaration body (before any variant).
- Attempting to use an object-literal type `{ key: T }` as a variant payload directly (wrap
  it in a named variant instead).
- An empty variant list (`type Result<T,E> =` with nothing following `=`).
- Using TypeScript `enum`-style syntax (`type Direction = { North, South, East, West }`).

## Example

```sjs
// ✗ error — lowercase variant name
type Color = red | green | blue
//           ^^^ SJS-P004: Invalid sum type declaration; variant names must start with an
//                         uppercase letter — did you mean 'Red | Green | Blue'?

// ✗ error — mixed positional and named payload fields
type Event = Click(x: number, number) | KeyPress(string)
//                            ^^^^^^ SJS-P004: Invalid sum type declaration; payload fields
//                                   must be either all named or all positional within a variant

// ✗ error — TypeScript enum style
type Direction = { North, South, East, West }
//               ^ SJS-P004: Invalid sum type declaration; use '= North | South | East | West'
//                         or 'SJS-E010' if you wrote 'enum Direction { ... }'

// ✗ error — empty body
type Result<T, E> =
//                 ^ SJS-P004: Invalid sum type declaration; expected variant name after '='
```

## Fix

Capitalise variant names and use consistent payload syntax:

```sjs
// ✓ correct — capitalized variants, no payload
type Color = Red | Green | Blue

// ✓ correct — named payload fields (all named)
type Event = Click(x: number, y: number) | KeyPress(key: string)

// ✓ correct — positional payload fields (all positional)
type Pair<A, B> = Pair(A, B)

// ✓ correct — enum-style without payload
type Direction = North | South | East | West
```

## Notes

- SJS enforces that variant names are capitalized to keep the grammar unambiguous: a capitalized
  identifier in a type position always refers to a variant, while a lowercase identifier always
  refers to a type variable or alias.
- The runtime representation of sum types is `{ _tag: "VariantName", _0: payload0, _1: payload1,
  ... }` for positional fields, or `{ _tag: "VariantName", fieldName: value, ... }` for named
  fields. This representation is stable and part of the public API contract.

## Related codes

- `SJS-P001` — unexpected token (general)
- `SJS-P003` — invalid syntax in type annotation (type-expression context)
- `SJS-E010` — TypeScript `enum` is not allowed; use sum types
- `SJS-E007` — non-exhaustive `match` expression (runtime consequence of sum types)
