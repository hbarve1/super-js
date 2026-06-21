---
title: 'SJS-P002 — Unexpected end of file'
description: 'SJS-P002 diagnostic reference'
sidebar_position: 99
section: error-codes
error_code: 'SJS-P002'
---


**Severity:** error  
**Category:** parser  
**Stage:** Stage 1

## Description

The parser reached the end of the source file while still inside an open grammar production —
for example, inside an unclosed brace, parenthesis, bracket, string literal, template literal,
block comment, or generic type argument list.

SJS-P002 is a specialised variant of SJS-P001 where the offending "token" is the synthetic
`EOF` token. Because there are no more tokens to consume, panic-mode recovery cannot advance
forward; instead the parser closes all open productions with synthetic `ErrorNode` placeholders
so that the rest of the diagnostic pipeline still receives a structurally valid (if incomplete)
AST.

Common triggers:

- Forgetting a closing `}` at the end of a function, class, object literal, or `match` block.
- An unterminated string literal or template literal spanning to EOF.
- An unclosed generic type argument list `<T` with no closing `>`.
- An unclosed block comment `/* … ` that consumes the rest of the file.

## Example

```sjs
// ✗ error — missing closing brace
function add(a: number, b: number): number {
  return a + b
// ^ SJS-P002: Unexpected end of file; expected '}'

// ✗ error — unterminated template literal
const msg = `Hello, ${name}
//          ^ SJS-P002: Unexpected end of file inside template literal; expected '`'

// ✗ error — unclosed generic list
type Pair = Map<string
//              ^^^^^^ SJS-P002: Unexpected end of file; expected '>'
```

## Fix

Close every open delimiter:

```sjs
// ✓ correct
function add(a: number, b: number): number {
  return a + b
}

// ✓ correct
const msg = `Hello, ${name}`

// ✓ correct
type Pair = Map<string, number>
```

## Notes

- SJS-P002 is always the *last* diagnostic in a compilation that terminates with an open
  production: the parser emits it once at the outermost unclosed production, then returns
  immediately. Subsequent error passes (type checker, etc.) operate on the AST with
  `ErrorNode` sentinels.
- Unclosed block comments (`/* … ` without `*/`) produce SJS-P002 from the *lexer*, not the
  parser, because the comment consumes all remaining input before the parser sees any token.
- When multiple delimiters are open, the error span points to the innermost unclosed delimiter's
  opening token, which is usually the most actionable location for the developer.

## Related codes

- `SJS-P001` — unexpected token (general case; SJS-P002 is its EOF specialisation)
- `SJS-P099` — too many parse errors; recovery abandoned
