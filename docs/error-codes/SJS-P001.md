---
title: 'SJS-P001 — Unexpected token'
description: 'SJS-P001 diagnostic reference'
sidebar_position: 99
section: error-codes
error_code: 'SJS-P001'
---


**Severity:** error  
**Category:** parser  
**Stage:** Stage 1

## Description

The parser encountered a token that is not valid at the current position in the grammar. This
is the most general parser error and can be emitted in two modes:

- **Panic mode** — the parser has no plausible interpretation of the token and must discard
  tokens until it reaches a synchronisation point (see `specs/parser-recovery.md`).
- **Phrase mode** — the parser can make a reasonable best-effort interpretation and continues
  with a synthetic `ErrorNode` inserted into the AST.

Common triggers include:

- A punctuation character that is not valid in the current context (e.g. `@@`, `###`, `$$`).
- A keyword used in the wrong position (e.g. `function` inside an expression context where a
  value was expected, or `return` at the top level outside a function body).
- A missing token that causes the next real token to appear out of place (e.g. a missing `:` in
  a type annotation causes the type name to appear where `:` was expected).
- The TypeScript prefix-cast syntax `<T>expr` — not valid in SJS; use `expr as T` instead
  (see also `SJS-P005`).

## Example

```sjs
// ✗ error — invalid punctuation
const value = @@invalid
//            ^^ SJS-P001: Unexpected token '@@'; expected expression

// ✗ error — missing ':' in type annotation causes 'string' to appear unexpectedly
function greet(name string): string {
//                  ^^^^^^ SJS-P001: Unexpected token 'string'; expected ':'
  return `Hello, ${name}`
}

// ✗ error — TypeScript-style prefix cast is not valid in SJS
const n = <number>someValue
//        ^ SJS-P001: Unexpected token '<'; did you mean 'someValue as number'?
```

## Fix

Remove or replace the invalid token. For a missing `:` in a type annotation:

```sjs
// ✓ correct
function greet(name: string): string {
  return `Hello, ${name}`
}
```

For a TypeScript prefix cast, use the `as` operator:

```sjs
// ✓ correct
const n = someValue as number
```

## Notes

- SJS-P001 is also the code stored in synthetic `ErrorNode` spans produced during phrase-mode
  recovery when no more-specific parser code applies.
- The structured diagnostic carries an `expected` field listing the tokens that would have been
  valid at that position; the rendered error message surfaces the most likely candidate.
- See `specs/parser-recovery.md` for the full description of panic vs phrase mode and how
  synchronisation sets are chosen.

## Related codes

- `SJS-P002` — unexpected end of file (the special case where the offending "token" is EOF)
- `SJS-P003` — invalid syntax in type annotation (more specific context)
- `SJS-P004` — invalid sum type declaration (more specific context)
- `SJS-P005` — invalid match expression / invalid cast syntax (more specific context)
- `SJS-P099` — too many parse errors; recovery abandoned
