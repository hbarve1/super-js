# Lexical Structure

**Status:** v1.0 — assembled from `specs/grammar.ebnf`  
**Grammar:** `specs/grammar.ebnf` § Identifiers and Keywords, § Literals  
**Errors:** `SJS-P001`–`SJS-P005` (parse errors); see `060-error-codes-map.md`

---

## Overview

SuperJS source text is a sequence of Unicode code points encoded in UTF-8. The
lexer produces a token stream consumed by the parser. SJS follows ECMAScript
lexical rules for whitespace, line terminators, and automatic semicolon insertion
(ASI), with additional tokens for type annotations, sum types, and `match`.

## Whitespace and comments

- **Whitespace:** space, tab, vertical tab, form feed, non-breaking space, and
  other Unicode space separators are skipped between tokens.
- **Line terminators:** LF, CR, CRLF, LS, PS — terminate a logical line for ASI.
- **Comments:** `//` line comments and `/* … */` block comments are skipped. Block
  comments do not nest.

## Tokens

| Category | Examples | Grammar |
|----------|----------|---------|
| Identifier | `foo`, `_x`, `$ref`, Unicode letters | `<Identifier>` |
| Keyword | `match`, `dynamic`, `type`, `function` | see `000-keywords.md` |
| Numeric literal | `42`, `0xFF`, `1.5`, `1e3` | `<NumericLiteral>` |
| String literal | `"hi"`, `'hi'`, `` `tpl` `` | `<StringLiteral>`, `<TemplateLiteral>` |
| Punctuation | `{ } ( ) [ ] , ; : ? .` | terminals in `grammar.ebnf` |
| Type punctuation | `|`, `?` (nullable suffix), `<` `>` (generics) | `<Type>` productions |

## Identifiers

An `<Identifier>` is a Unicode identifier start character (`Letter`, `_`, `$`)
followed by zero or more identifier part characters (`Letter`, digit, `_`, `$`,
or Unicode combining marks). Identifiers that spell a **reserved keyword** (see
`000-keywords.md`) are tokenised as keywords, not identifiers.

## Literals

- **Boolean:** `true`, `false`
- **Nullish:** `null`, `undefined`
- **Numbers:** decimal, hex (`0x`), binary (`0b`), octal (`0o`), with optional
  fractional and exponent parts per ECMA-262.
- **Strings:** single-quoted, double-quoted, with escape sequences per ECMA-262.
- **Templates:** backtick-delimited with `${ Expression }` interpolations.

## Automatic semicolon insertion (ASI)

ASI applies at the same restricted productions as ECMAScript strict mode. The
parser emits `SJS-P002` when a required semicolon is missing and ASI does not
apply.

## BiDi and security

The lexer applies Unicode TR39 confusable detection for identifier spoofing
(`SJS-L011` security diagnostic in strict tooling modes). See `000-keywords.md`
for reserved-word policy.

## Grammar reference

The authoritative token and literal productions are in `specs/grammar.ebnf` under
**IDENTIFIERS AND KEYWORDS** and the literal non-terminals referenced by
`<PrimaryExpression>`.
