---
title: 'SJS-P099 — Too many parse errors; recovery abandoned'
description: 'SJS-P099 diagnostic reference'
sidebar_position: 99
section: error-codes
error_code: 'SJS-P099'
---


**Severity:** error  
**Category:** parser  
**Stage:** Stage 1

## Description

The parser entered phrase-mode error recovery three times on the same top-level item (statement,
declaration, or expression) without successfully parsing the item to completion. After three
consecutive phrase-recovery failures the parser considers the item unrecoverable and abandons
further recovery for it.

When SJS-P099 is emitted:

1. The per-item phrase-recovery counter has reached **3**.
2. Phrase mode is disabled for the remainder of the current item.
3. The parser escalates immediately to **panic mode at the item boundary** — it discards tokens
   until it reaches a synchronisation token for the enclosing `<Statement>` or `<Program>`
   production (see `specs/parser-recovery.md` §Synchronisation Sets).
4. Parsing resumes at the next top-level item. Diagnostics from subsequent items are reported
   normally; only the single bad item is abandoned.

This threshold prevents the parser from emitting an unbounded cascade of phantom error messages
for a single malformed item. In practice the three-failure limit means SJS always reports at
least a few useful diagnostics per item before giving up.

See `specs/parser-recovery.md` §Phrase-Mode Recovery for the authoritative algorithm.

## Example

```sjs
// ✗ A heavily malformed statement triggers SJS-P099
function foo() {
  const result = bar(1, (2 + ### * 4), 5)
  //                       ^^^ — phrase recovery 1: SJS-P001 (unexpected '###')
  //                           ^ — phrase recovery 2: SJS-P001 (unexpected '*'; expected ')')
  //                              ^ — phrase recovery 3: SJS-P001 (unexpected ')'; expected ')')
  //                                 — SJS-P099: recovery abandoned; skipping to next statement
}
```

The diagnostics emitted for the example above (in order):

```
SJS-P001  error  2:17  Unexpected token '###'; expected expression
SJS-P001  error  2:18  Unexpected token '*'; expected ')'
SJS-P001  error  2:22  Unexpected token ')'; expected ')'
SJS-P099  error  2:3   Too many parse errors; recovery abandoned for this item
```

After SJS-P099 the parser resumes at `}` (the sync token for `<Statement>` / `<FunctionDecl>`
body) and continues parsing the rest of `foo`'s body — or, if `foo` itself is abandoned, the
top-level program.

## Fix

Correct the underlying syntax errors that triggered the three phrase-recovery attempts.
Typically this means:

1. Read the **first** SJS-P001 (or more specific code) reported for the item — it usually
   points directly at the root cause.
2. Fix that error, then recompile. Subsequent phantom errors usually disappear once the first
   is resolved.

```sjs
// ✓ correct — bad token removed; expression is now valid
function foo() {
  const result = bar(1, (2 + 3) * 4, 5)
}
```

## Notes

- SJS-P099 is **never** emitted for a well-formed file; it only appears when there are already
  three preceding SJS-P00x diagnostics for the same item.
- The item boundary at which escalation occurs is always the smallest enclosing top-level
  construct: a `<Statement>` inside a function body, or a `<Declaration>` at the module level.
  The parser never abandons recovery above the `<Program>` level.
- The per-item phrase-recovery counter is **reset** for each new top-level item, so a file with
  multiple badly-formed items may emit SJS-P099 more than once.

## Related codes

- `SJS-P001` — unexpected token (the diagnostic that increments the phrase-recovery counter)
- `SJS-P002` — unexpected end of file
- `SJS-P003` — invalid syntax in type annotation
- `SJS-P004` — invalid sum type declaration
- `SJS-P005` — invalid match expression
