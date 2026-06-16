# SuperJS Parser Error Recovery

## Overview

The Stage 1 parser employs two complementary recovery strategies to maximise the number of
diagnostics reported in a single pass, rather than aborting at the first syntax error.

- **Panic mode** — activated on a *hard* parse error.  The parser discards tokens until it
  reaches a *synchronisation token* for the nearest enclosing grammar production, then resumes
  parsing from that production.  If no synchronisation token is found within 20 lookahead tokens
  the panic escalates to the **item boundary** (the enclosing top-level statement).

- **Phrase mode** — activated on a *soft* parse error inside an expression, type annotation, or
  pattern.  The parser inserts a synthetic `ErrorNode` and attempts to continue parsing the
  current expression with degraded accuracy.  Three consecutive phrase-recovery failures on the
  same item trigger `SJS-P099` and cause an escalation to panic mode at the item boundary.

Both modes emit structured diagnostics (see [Error codes](#error-codes-used-by-recovery)) that
carry source location information for IDE integration.

---

## Synchronisation Sets Per Production

Each production defines the set of tokens at which parsing may safely resume after an error.
The parser consults the innermost active production first, then walks outward.

| Production | Sync tokens |
|---|---|
| `<Program>` | `import`, `export`, `const`, `let`, `function`, `class`, `type`, `EOF` |
| `<Statement>` | `const`, `let`, `var`, `function`, `class`, `type`, `return`, `if`, `while`, `for`, `break`, `continue`, `throw`, `try`, `}` |
| `<FunctionDecl>` | `{` (start of body), `)` (end of params) |
| `<ClassDecl>` | `{` (start of body) |
| `<TypeAnnotation>` | `:`, `=`, `{`, `}`, `,`, `)`, `=>` |
| `<Expression>` | `;`, `}`, `)`, `]`, `,`, `=>`, `EOF` |
| `<MatchArm>` | `=>`, `,`, `}` |
| `<TypeDecl>` | `=` (for `type X = …`), `{` |

> **Note:** a token may appear in multiple sync sets.  The parser always uses the sync set of the
> *nearest enclosing* production that contains the token.

---

## Panic-Mode Recovery

Panic mode is entered whenever the parser encounters a token that cannot be reduced under any
rule for the current production and phrase-mode recovery has either not been attempted or has
already escalated.

**Algorithm:**

1. Emit a diagnostic (`SJS-P001` for unexpected token, `SJS-P002` for unexpected EOF) with the
   current source position.
2. Record the nearest enclosing production and look up its sync set.
3. Advance the token stream, discarding each token, until:
   - a sync token for the current production is found, **or**
   - 20 tokens have been discarded without finding a sync token.
4. If a sync token was found, resume parsing the current production from that token.
5. If the 20-token limit was reached without a sync token, **escalate** to the item boundary
   (the enclosing `<Statement>` or `<Program>` production) and repeat from step 2 with the
   parent sync set.  Escalation is not re-attempted above `<Program>`.

**Invariants:**

- Panic mode never emits more than one diagnostic per error site; subsequent errors found during
  token-skipping are silently dropped until parsing resumes.
- The resulting AST contains `ErrorNode` placeholders for each site where tokens were discarded,
  preserving tree structure for downstream stages.

---

## Phrase-Mode Recovery

Phrase mode handles soft errors — situations where the parser can make a reasonable guess about
the intended construct and continue without discarding large regions of the token stream.

**Algorithm:**

1. Detect a soft error (e.g. missing punctuation, unexpected token that could be elided).
2. Insert a synthetic `ErrorNode` into the AST at the current position.  The node carries:
   - `code`: `SJS-P001` or a more specific code when applicable.
   - `span`: the span of the offending token.
   - `expected`: the token(s) that would have been valid.
3. Continue parsing the current expression, type, or pattern as if the error had not occurred,
   using the best-effort interpretation.
4. Track a per-item phrase-recovery counter.  Each invocation of phrase mode on the same
   top-level item increments the counter.
5. When the counter reaches **3**, emit `SJS-P099`, stop phrase-mode recovery for the item, and
   escalate immediately to panic mode at the item boundary.

**When phrase mode is preferred over panic mode:**

- Missing `:` in a type annotation.
- Missing `,` between function parameters or object properties.
- Missing closing delimiter (`)`, `]`, `}`) at the end of an expression where the next token
  is unambiguously part of the enclosing context.

---

## Error Codes Used by Recovery

| Code | Severity | Short message | When emitted |
|------|----------|---------------|--------------|
| `SJS-P001` | error | Unexpected token | Panic or phrase mode: token not valid at current position |
| `SJS-P002` | error | Unexpected EOF | Panic mode: EOF reached while inside an open production |
| `SJS-P099` | error | Too many errors; recovery abandoned for this item | Phrase mode: three consecutive recoveries on the same item |

Full code definitions live in [`spec/error-codes.md`](./error-codes.md).

---

## Examples

### Example 1 — Missing `:` in type annotation (phrase recovery)

**Source:**

```superjs
const x string = "hello";
```

**What happens:**

The parser expects `:` after `x` before the type annotation.  `string` is encountered instead.
Phrase mode activates: an `ErrorNode` (`SJS-P001`, "expected `:`") is inserted, and parsing
continues treating `string` as the type.  The `,` after `"hello"` correctly ends the
declaration.  One diagnostic is emitted; the rest of the file parses normally.

**Diagnostic:**

```
SJS-P001  error  1:8  Unexpected token 'string'; expected ':'
```

---

### Example 2 — Invalid token inside a match arm (panic to `}`)

**Source:**

```superjs
match value {
  1 => "one",
  @@@ => "bad",
  3 => "three",
}
```

**What happens:**

`@@@` is not a valid pattern.  The sync set for `<MatchArm>` is `{'=>', ',', '}'}`.  Panic mode
activates, discards `@@@`, and finds `=>` within 20 tokens.  Parsing resumes at `=>`, so
`"bad"` is parsed as the arm body.  The next arm (`3 => "three"`) is parsed normally.

**Diagnostic:**

```
SJS-P001  error  3:3  Unexpected token '@@@'; expected pattern
```

---

### Example 3 — Deeply nested error escalating to item boundary

**Source:**

```superjs
function foo() {
  const result = bar(1, (2 + ### * 4), 5);
}
```

**What happens:**

`###` is invalid inside the parenthesised sub-expression.  Phrase mode activates; an `ErrorNode`
is inserted and parsing attempts to continue the expression.  The `)` needed to close `(2 + …)`
is then missing, triggering a second phrase recovery.  A third soft error is detected while
trying to close `bar(…)`.  The per-item counter reaches 3, so `SJS-P099` is emitted and panic
mode escalates to the `<Statement>` boundary.  The parser discards tokens until `}` (a
`<Statement>` sync token) and resumes parsing the body of `foo` after the bad statement.

**Diagnostics (in order):**

```
SJS-P001  error  2:17  Unexpected token '###'; expected expression
SJS-P001  error  2:18  Unexpected token '*'; expected ')'
SJS-P001  error  2:22  Unexpected token ')'; expected ')'
SJS-P099  error  2:3   Too many errors; recovery abandoned for this item
```
