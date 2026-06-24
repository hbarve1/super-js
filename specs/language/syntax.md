# Syntax

**Status:** v1.0 — cross-reference to `specs/grammar.ebnf`  
**Grammar:** full concrete syntax in `specs/grammar.ebnf`  
**Errors:** `SJS-P001`–`SJS-P005`; feature-specific codes in per-topic specs

---

## Overview

SJS concrete syntax is a strict subset of JavaScript plus typed extensions. The
machine-readable grammar is `specs/grammar.ebnf` (EBNF). This section indexes the
major non-terminals and points to normative feature specs for semantics.

## Top-level structure

```
<Program> ::= { <Statement> }
```

A compilation unit is a sequence of statements and declarations. Module semantics
follow ES modules when `import` / `export` appear (`023-modules.md`).

## Major production groups

| Group | Root non-terminal | Feature specs |
|-------|-------------------|---------------|
| Declarations | `<VariableDecl>`, `<FunctionDecl>`, `<ClassDecl>`, `<TypeDecl>` | `020`–`023` |
| Statements | `<IfStatement>`, `<ForStatement>`, `<ReturnStatement>`, … | `040`–`042` |
| Expressions | `<Expression>`, `<MatchExpression>`, `<CallExpression>` | `001`–`003`, `030`–`039` |
| Types | `<Type>`, `<SumType>`, `<FunctionType>` | `010`–`016`, `005`–`006` |
| Modules | `<ImportDecl>`, `<ExportDecl>` | `023-modules.md` |
| JSX | `<JsxElement>` | `039-jsx.md` |

## SJS-specific syntax

| Construct | Grammar | Spec |
|-----------|---------|------|
| Sum type declaration | `<TypeDecl>` with `\|` variants | `002-sum-types.md` |
| Variant constructor | `<CallExpression>` on capitalised name | `002-sum-types.md` |
| `match` expression | `<MatchExpression>` | `003-match.md` |
| Nullable type `T?` | `<NullableType>` | `001-null-safety.md` |
| `dynamic` type | `<PrimitiveType>` | `004-dynamic.md` |

## Banned syntax

Constructs that parse in TypeScript but are **rejected** by SJS are listed in
`007-banned-features.md`. The grammar file documents banned keywords in its
header comment; the checker emits `SJS-E004`–`SJS-E012` for violations.

## Parser recovery

On syntax error the parser emits `SJS-P001` and attempts single-token recovery
until `SJS-P099` (too many errors). Recovery strategy is implementation-defined
but must not produce cascading internal errors.

## Relationship to ECMAScript

Where a production is not listed in `grammar.ebnf`, SJS does not support it.
Where listed without an SJS-specific rule, ECMA-262 semantics apply unless a
feature spec narrows behaviour (e.g. always-strict mode, no `with` — `SJS-E013`).
