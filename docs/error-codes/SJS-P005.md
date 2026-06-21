---
title: 'SJS-P005 — Invalid match expression'
description: 'SJS-P005 diagnostic reference'
sidebar_position: 99
section: error-codes
error_code: 'SJS-P005'
---


**Severity:** error  
**Category:** parser  
**Stage:** Stage 1

## Description

A `match` expression contains syntax that does not conform to the SJS match grammar, or a
TypeScript-style prefix cast (`<T>expr`) was used where SJS requires the postfix `as` operator.

**Match grammar violations** are emitted when the parser has entered `match` context (after
consuming `match <expr> {`) but the arm patterns or arm bodies contain invalid syntax. Examples:

- A pattern that is not a valid SJS pattern (variant, literal, identifier, destructure, or
  wildcard `_`).
- An arm body (after `=>`) that is not a valid expression or block.
- Missing `=>` between a pattern and its body.
- An arm guard (`if <condition>`) that contains a syntax error.
- Nested `match` arms without proper bracing.

**Prefix cast (`<T>expr`) violations** occur because SJS does not support the TypeScript/JSX
angle-bracket cast syntax. In TypeScript you can write `<string>someValue` as an alternative to
`someValue as string`; in SJS this is always a parse error because angle brackets are reserved
for generic type arguments and JSX elements, making the prefix-cast syntax ambiguous and
therefore excluded. Use the `as` operator instead.

## Example

```sjs
// ✗ error — missing '=>' in match arm
match status {
  Ok(v)  v.toString()          // SJS-P005: expected '=>' after pattern 'Ok(v)'
//        ^ SJS-P005
  Err(e) => e.message,
}

// ✗ error — invalid pattern (not a valid SJS pattern)
match value {
  [1, 2, ...rest] => rest,     // array-spread pattern not yet supported
//^^^^^^^^^^^^^^^^^^ SJS-P005: Invalid match expression; array-rest pattern not supported
}

// ✗ error — prefix cast syntax
const len = <string>rawValue
//          ^ SJS-P005: Invalid match expression — or rather: '<T>expr' prefix cast is not
//            valid in SJS; use 'rawValue as string'
```

Annotated inline:

```sjs
match result {
  Ok  => "ok",       // SJS-P005: 'Ok' is a variant; use 'Ok(_)' or 'Ok(v)' to match payload,
//^^^               //   or 'Ok' (no parens) if the variant has no payload
}
```

## Fix

For match expression errors, add the missing `=>`, correct the pattern syntax, or add a
catch-all arm:

```sjs
// ✓ correct
match status {
  Ok(v)  => v.toString(),
  Err(e) => e.message,
}
```

For a prefix cast, replace `<T>expr` with `expr as T`:

```sjs
// ✓ correct
const len = rawValue as string
```

## Notes

- The prefix-cast restriction applies globally — even outside a `match` block. The SJS parser
  checks for `<identifier>` followed by a non-comparison token as a heuristic and emits
  SJS-P005 with the `as`-operator suggestion rather than attempting to parse a generic call.
- Guard expressions in `match` arms use the `if` keyword:
  `Ok(v) if v > 0 => "positive"` — a syntax error inside the guard condition emits SJS-P001,
  not SJS-P005.
- See `specs/grammar.ebnf` §MatchExpression for the complete pattern grammar.

## Related codes

- `SJS-P001` — unexpected token (general; emitted for guard syntax errors)
- `SJS-P003` — invalid syntax in type annotation
- `SJS-E007` — non-exhaustive match expression (semantic, not syntactic)
- `SJS-W003` — unreachable match arm
