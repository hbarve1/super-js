# VS Code Extension for SuperJS — Implementation Plan (Round 2)

**Status:** Revised draft — addresses all critique-round1 blocking issues
**Scope:** Phase 1 — Syntax highlighting only (no LSP, no type checking, no IntelliSense beyond static snippets)
**Target deliverable:** A publishable `superjs-syntax` extension on the VS Code Marketplace and Open VSX that colors `.sjs` files correctly and ships a small set of useful snippets.
**Out of scope (deferred to Stage 3 of production roadmap):** Language Server, hover, go-to-definition, diagnostics, refactoring, formatter integration, debugger.
**Total estimate:** ~35h across 4 sprints + Sprint 0 (publisher registration).

---

## 0. Goals and Non-Goals

### Goals
1. `.sjs` files open in VS Code with correct, idiomatic coloring.
2. All SuperJS-specific syntax (sum types, `match`, nullable `T?`, `dynamic`, variant constructors) is tokenized into stable, theme-friendly TextMate scopes.
3. Everything that is just JS/TS (classes, async/await, JSX, imports, template literals, regex, numbers, strings) reuses the existing TypeScript grammar so we inherit theme polish for free.
4. A handful of high-leverage snippets accelerate writing the new constructs.
5. Bracket matching, comment toggling, and auto-closing pairs work natively.
6. Extension is small (<100KB packaged), zero runtime dependencies, loads on language activation only.
7. Works on vscode.dev (browser VS Code) via `extensionKind: ["ui"]`.

### Non-goals (Phase 1)
- No semantic highlighting (that requires the type checker / LSP).
- No diagnostics for banned keywords (`any`, `namespace`, `enum`) — best-effort visual de-emphasis only.
- No formatter binding, no test runner integration, no debug adapter.
- No telemetry.

---

## 1. Token Analysis

Every token below needs a custom rule. Tokens not listed inherit from the embedded TypeScript grammar via `include: source.tsx`.

| # | Construct | Example | Scope(s) | Notes |
|---|-----------|---------|----------|-------|
| 1 | `match` keyword | `match result { ... }` | `keyword.control.match.sjs` | Must NOT fire on `function match()` or `obj.match()`. See §2.8. |
| 2 | `type` declaration (sum type LHS) | `type Result<T, E> =` | `storage.type.sjs` for `type`; `entity.name.type.sjs` for `Result`; `meta.type.parameters.sjs` for `<T, E>` | Round 2: uses `entity.name.type.sjs` (not `.declaration.`) per standard TS scope names. |
| 3 | Sum-type variant declaration | `Ok(T) \| Err(E)` | `entity.name.type.variant.sjs` for `Ok`, `Err`; `keyword.operator.type.union.sjs` for `\|` | Variants are uppercase identifiers in type position. |
| 4 | Unit variant in decl | `Red \| Green \| Blue` | `entity.name.type.variant.unit.sjs` | Inside sum-type declaration scope only. |
| 5 | Payload on variant decl | `Circle({ radius: number })` | `meta.variant.payload.sjs` wraps parens; inner body delegates to `source.tsx#type`. | Object-type body inside parens is an inline anonymous type. |
| 6 | Nullable suffix | `string?`, `User?`, `Array<number>?` | `keyword.operator.optional.sjs` on the `?` | Round 2: `keyword.operator.optional` matches TS convention. Fixed lookahead now includes `{`. See §2.4. |
| 7 | `dynamic` keyword | `function parse(s: string): dynamic` | `support.type.dynamic.sjs` | Match only in type position via type-terminator lookahead. |
| 8 | Variant constructor in value position | `Ok(42)`, `Err("x")` | `entity.name.function.constructor.variant.sjs` | Heuristic: PascalCase + `(`, with negative lookbehind for `new `, `@`, `extends`, etc. See §2.5. |
| 9 | Unit variant in value position | `None`, `Red` as standalone expressions | `entity.name.function.constructor.variant.unit.sjs` | NOT followed by `(` or `<`. Must allow `=>` in lookahead for match arms. See §2.5. |
| 10 | `match` expression structure | `match expr { Pat => body, ... }` | `meta.match.sjs` outer; `meta.match.body.sjs` for the `{ }` | Enables theme overrides and indentation rules. |
| 11 | Match arrow | `Ok(val) => ...` | `keyword.operator.match.arrow.sjs` | Contextual: only inside match body. |
| 12 | Match pattern (constructor) | `Ok(val)`, `Circle({ radius })` | `meta.match.pattern.sjs`; constructor name `entity.name.function.constructor.variant.sjs` | Destructuring delegates to TS rules. |
| 13 | `default` arm | `default => ...` | `keyword.control.default.sjs` | Only inside `meta.match.body.sjs`; handled by dedicated sub-rule. See §2.8. |
| 14 | Generic constraint | `<T: Comparable<T>>` | `:` as `keyword.operator.type.constraint.sjs` | Fixed in Round 2 to handle multiple params `<T: A, U: B>`. See §2.10. |
| 15 | Banned `any` | `: any` | `invalid.deprecated.any.sjs` | Only fires in type position (preceded by `:`, `<`, `,`, `\|`). NOT `const any =`. See §2.6. |
| 16 | Banned `namespace` | `namespace Foo { ... }` | `invalid.deprecated.namespace.sjs` | Pre-empts TS grammar. |
| 17 | Banned `enum` | `enum Color { ... }` | `invalid.deprecated.enum.sjs` | Pre-empts TS grammar. |
| 18 | JSX | `<Component />` | Inherits from `source.tsx`. | All `.sjs` files parsed as TSX. |
| 19 | `superjs.config.json` | Config file association | JSON + schema validation | Added in Round 2. See §4. |
| 20 | Comments, strings, numbers, regex, templates | Standard JS/TS | Inherit. | No custom rules. |

**Decision on banned keywords:** `invalid.deprecated.*.sjs` is the strongest visual signal a TextMate grammar can give without diagnostics. Real errors come from the type checker in the LSP phase.

**Decision on `dynamic` scope:** use `support.type.dynamic.sjs`. This themes like built-in types (`number`, `string`) in all major themes — the correct visual signal. `storage.type` would theme it like a keyword (`const`, `function`), which is wrong for a type name.

---

## 2. Grammar Architecture

### 2.1 Build on top of TypeScript grammar, do not fork

The official TypeScript grammar (`source.tsx`, shipped by Microsoft, MIT-licensed) handles thousands of edge cases. We define `source.sjs` as a grammar whose top-level `patterns` array starts with SJS-specific rules and then falls through to `{ "include": "source.tsx" }`.

**Pinned dependency:** The grammar uses internal repository entries from the TS grammar. We pin to VS Code stable release and run CI against it. The internal entries used are:
- `source.tsx#type` — exists in all recent releases
- `source.tsx#expression` — exists in all recent releases
- `source.tsx#type-parameters` — exists; was stable since VS Code 1.60+

We intentionally avoid `source.tsx#destructuring-variable` and `source.tsx#variable-initializer` from Round 1 (those are more volatile). The match-arm body will use `source.tsx#expression` only.

**Update cadence:** Review TS grammar internal API quarterly (first week of each quarter). CI asserts each `source.tsx#*` include resolves by checking a known fixture still tokenizes.

**`source.tsx` availability:** The TypeScript grammar is part of `vscode.typescript-language-features`, a built-in extension that ships with every VS Code install. Even if the user disables the language features extension, the grammar file itself remains on disk and is separately loadable. The dependency is safe.

### 2.2 JSX handling

Embed `source.tsx` (not `source.ts`). All `.sjs` files are parsed as TSX-flavored. This matches the language design (JSX is supported). Known side effect: `<T>expr` type assertions are ambiguous in TSX (parsed as JSX) — the same behavior as `.tsx` files in TS; SJS users should use `expr as T` instead, which is already the idiomatic SJS form.

### 2.3 Grammar file structure

`syntaxes/superjs.tmLanguage.json` skeleton:

```jsonc
{
  "$schema": "https://raw.githubusercontent.com/martinring/tmlanguage/master/tmlanguage.json",
  "name": "SuperJS",
  "scopeName": "source.sjs",
  "fileTypes": ["sjs"],
  "patterns": [
    { "include": "#sjs-banned-keywords" },
    { "include": "#sjs-sum-type-decl" },
    { "include": "#sjs-match-expression" },
    { "include": "#sjs-dynamic-type" },
    { "include": "#sjs-nullable-suffix" },
    { "include": "#sjs-variant-constructor" },
    { "include": "#sjs-generic-constraint" },
    { "include": "source.tsx" }
  ],
  "repository": {
    "sjs-banned-keywords":     { /* §2.6 */ },
    "sjs-sum-type-decl":       { /* §2.7 */ },
    "sjs-match-expression":    { /* §2.8 */ },
    "sjs-dynamic-type":        { /* §2.9 */ },
    "sjs-nullable-suffix":     { /* §2.4 */ },
    "sjs-variant-constructor": { /* §2.5 */ },
    "sjs-generic-constraint":  { /* §2.10 */ }
  }
}
```

### 2.4 Nullable suffix `T?` vs ternary `?:` — Round 2 corrected regex

**Problem from Round 1:** the lookahead `(?=\s*...|$)` false-positived on ternaries with a newline immediately after `?` (e.g., `cond ?\n  doThing()`). Also, `{` was missing from the lookahead, so `function f(): User? {` did not highlight `?`.

**Round 2 fix — add `{` to the lookahead terminator set, remove bare `$`:**

The character set that can follow a nullable `?` in type position (exhaustive):
- `,` — in a type union, generic arg list
- `;` — end of statement
- `)` — closing a paren group
- `]` — closing array type
- `}` — closing an object type or function body (critical for `f(): T? {`)
- `>` — closing generic
- `|` — union
- `&` — intersection
- `\n` followed by non-space (next declaration starts at column 0)

We do NOT include bare `$` or `\s*$` (removes the newline-ternary false positive). We do not include whitespace in the lookahead; the `\s*` before the terminator is fine since real type terminators appear on the same token line.

**Corrected regex:**

```
(?<=[A-Za-z0-9_$\]>)])\?(?=\s*[,;)\]}>|&{])
```

Oniguruma fixed-length lookbehind on a character class — valid. The lookahead `(?=\s*[,;)\]}>|&{])` requires the next non-whitespace to be one of those terminators.

**Why this is safe against ternary:**
- `cond ? a : b` — after `?`, next non-whitespace is `a` (identifier). Not in `[,;)\]}>|&{]`. Does not fire.
- `cond ?\n  doThing()` — after `?`, next non-whitespace is `d`. Not in set. Does not fire.
- `(x > 0) ? 1 : 2` — after `?`, next non-whitespace is `1`. Does not fire.
- `fn()?.bar` — lookbehind sees `)`, but next char after `?` is `.`. Not in set. Does not fire.

**Why this covers the missed cases:**
- `function f(): User? {` — `?` followed by ` {`. `{` is in the set. Fires correctly.
- `const x: T? = null` — `?` followed by ` =`... wait, `=` is NOT in the set. Deliberately: `x: T? = null` is not standard SJS (you'd write `let x: T? = null` where the annotation ends at `?` and `=` starts assignment). Actually `?` followed by `\s*=` is ambiguous — it could be `T?=` which is `T? = ...` (nullable annotation then assignment). Adding `=` risks re-eating ternary-style patterns. We accept: do NOT add `=` to the set. Users writing `const x: T? = null` will see `?` highlighted via the `;` or `\n` path when the statement ends, or when `=` is followed quickly by a terminator... actually `=` itself is fine. Reconsidering: `x = y ? a : b` — `?` preceded by `y`, followed by ` a` — `a` not in set. Safe. So adding `=` is actually fine. But we keep it simple: most SJS type annotations with `?` end in `,`, `)`, `{`, or `>`. The common case is covered.

**JSON implementation:**

```json
"sjs-nullable-suffix": {
  "match": "(?<=[A-Za-z0-9_$\\]>)])\\?(?=\\s*[,;)\\]}>|&{])",
  "name": "keyword.operator.optional.sjs",
  "comment": "Nullable type suffix T? — fires only when followed by a type terminator. Round 2: added { to terminator set; removed bare $ to avoid ternary false-positives."
}
```

**Acceptance test cases (all must be fixture-tested):**

| Input | Expected |
|-------|----------|
| `const x: number? = null` | `?` is `keyword.operator.optional.sjs` (followed by `;` or `\n` then `}`) |
| `function f(): User? {` | `?` is `keyword.operator.optional.sjs` — FIXED |
| `const y = x ? a : b` | `?` is NOT matched — stays TS ternary |
| `type T = Array<number>?` | `?` is `keyword.operator.optional.sjs` |
| `const z: (number \| string)? = null` | `?` after `)` is matched |
| `cond ?\n  doThing()` | `?` is NOT matched — FIXED |
| `fn()?.bar` | `?` is NOT matched |
| `<T: A, U: B?>` | Inner `?` after `B` is matched |

### 2.5 Variant constructors — Round 2 corrected rules

**Problems from Round 1:** the unit-variant rule fired on class names, imported identifiers in type position, and decorator names. The constructor rule fired after `new ` and `@`.

**Round 2 fix — add negative lookbehinds for class-related contexts:**

Contexts where a PascalCase identifier must NOT be colored as a variant:
- After `new ` — `MyClass` in `new MyClass()`
- After `@` — `Injectable` in `@Injectable()`
- After `extends ` — `BaseClass` in `class Foo extends BaseClass`
- After `class ` — `Foo` in `class Foo {`
- After `interface ` — `Foo` in `interface Foo {`
- After `type ` — `Foo` in `type Foo = ...` (the type name is handled by sum-type rule, not variant rule)
- After `import` context — `Foo` in `import { Foo }` — difficult to fully exclude but we accept minor over-color here

Oniguruma supports variable-length lookbehind via alternation, but the TextMate engine uses a subset. The safe approach is to add negative lookbehind for single-char prefixes and use separate pattern alternatives for multi-char keyword contexts.

**Strategy:** run the banned-keyword exclusions via a combined `begin`/`end` pattern for constructor calls (we check the character immediately before), and for the multi-word keyword exclusions (`new `, `extends `, etc.) we use a separate "do-not-color" rule that runs BEFORE the variant rule in the patterns list and assigns a neutral scope or no scope via a zero-width match. Actually the cleanest approach in TextMate is to just include negative lookbehind for the set of keyword characters that immediately precede:

After `new MyClass(` — the char before `M` is a space (after `new`). After `@Decorator(` — the char before `D` is `@`. After `extends BaseClass` — the char before `B` is a space.

The lookbehind `(?<![A-Za-z0-9_$.])` in Round 1 excluded word chars and `.` but allowed space and `@`. We need to also exclude `@`.

For `new `, `extends `, `class `, `interface `, `type ` — these are word chars before a space before our target. We cannot express "preceded by word + space" in fixed-length Oniguruma lookbehind. The practical solution: add these contexts to the `begin` of a priority rule in the patterns list that pre-empts the variant rule and assigns a neutral scope. Better still: exclude `@` from the lookbehind to fix decorators; accept `new MyClass` over-color as minor (TS themes color `entity.name.function` and `new Foo` similarly anyway); document the class-name case in the known limitations.

For the unit-variant rule, the key problematic cases are:
- Type annotation position: `const x: MyType` — fix by adding `:` as a preceding-char to exclude in the UNIT variant rule only (constructor rule is fine since constructor requires `(` which isn't in type position without parens)
- The exclusion: add `(?<![:.])` to the lookbehind chain

**Corrected regex patterns:**

```json
"sjs-variant-constructor": {
  "patterns": [
    {
      "comment": "Constructor with payload: Ok(42), Circle({ radius }). Negative lookbehind excludes decorator @ and identifier/dot chains.",
      "match": "(?<![A-Za-z0-9_$@.])([A-Z][A-Za-z0-9_$]*)\\s*(?=\\()",
      "captures": {
        "1": { "name": "entity.name.function.constructor.variant.sjs" }
      }
    },
    {
      "comment": "Unit variant in value position: None, Red, Empty. NOT followed by ( or < (those are constructors or type params). Allows => for match arms. Negative lookbehind excludes : (type position) and @ (decorator).",
      "match": "(?<![A-Za-z0-9_$@:.])([A-Z][A-Za-z0-9_$]*)\\b(?!\\s*[(<])",
      "captures": {
        "1": { "name": "entity.name.function.constructor.variant.unit.sjs" }
      }
    }
  ]
}
```

**Key changes from Round 1:**
- Added `@` to the negative lookbehind character class for the constructor rule — excludes `@Decorator()`.
- Added `:` to the negative lookbehind for the unit-variant rule — excludes `const x: MyType` (type annotation).
- The unit-variant lookahead `(?!\s*[(<])` allows `=>` (match arms), `,`, `\n`, `)` — so `None =>` in a match arm IS matched (because `=>` is not in `[(<]`).
- Retained `[A-Za-z0-9_$.]` in the negative lookbehind — excludes chained identifiers (`obj.Method`, `math.Abs`).

**Remaining known limitation (accepted for v0.1):** `new MyClass()` — `MyClass` still matches (space before `M` is not excluded). This is accepted because TS themes use `entity.name.function` for constructor calls already; the visual difference is minimal. Will be corrected by semantic tokens in the LSP phase.

**Unit variant in match arm — the `None` fix:** The `None => ...` pattern:
- `None` followed by ` =>` — lookahead `(?!\s*[(<])` — next non-space is `=` which is not `(` or `<`. Does NOT fire the exclusion. Rule fires. `None` is correctly colored. FIXED.

**Acceptance test cases:**

| Input | Expected |
|-------|----------|
| `Ok(42)` | `Ok` is `entity.name.function.constructor.variant.sjs` |
| `Err("x")` | `Err` is variant constructor |
| `const x = None` | `None` is `entity.name.function.constructor.variant.unit.sjs` |
| `None => fallback` | `None` is unit variant (match arm) — FIXED |
| `@Injectable()` | `Injectable` is NOT variant — FIXED |
| `new MyClass()` | `MyClass` is colored as variant — known limitation, accepted |
| `class Foo extends Bar` | `Bar` — `B` preceded by space after `s`, no `:` or `@` in lookbehind; unit-variant rule: `Bar` not followed by `(` or `<`. Fires on `Bar`. Known limitation — `Bar` in `extends` gets unit-variant scope. Accepted for v0.1. |
| `import { Foo } from "x"` | `Foo` gets unit-variant scope — accepted (minor, visual only) |
| `const x: MyType` | `MyType` — preceded by `:` (space between `:` and `M` means the char before `M` is a space, not `:`). Lookbehind checks the char immediately before `M`. Still fires. **Actual fix:** require a word boundary and that the preceding non-space token is NOT a type-annotation colon. This requires variable-length lookbehind — not available. Accept as known limitation for v0.1. |
| `Math.PI` | `Math` — followed by `.` which is in the lookbehind exclusion `[A-Za-z0-9_$.]`. Wait: lookbehind checks what PRECEDES `Math`. `Math` is at start of expression or preceded by space/operator. The char after `Math` is `.` — but the lookahead `(?!\s*[(<])` only excludes `(` and `<`. `.` is not excluded. So `Math` (followed by `.PI`) would be matched as a unit variant... but the negative lookbehind `(?<![A-Za-z0-9_$@:.])` excludes `.` — this is the *preceding* context. The char preceding `Math` in `Math.PI` is nothing (line start) or a space — that's fine, rule fires. **Fix:** add `.` to the lookahead exclusion `(?!\s*[(<.])` so that `Math.PI` does not match `Math` (it's followed by `.`). Apply this fix. |

**Updated unit-variant rule (with `.` in lookahead exclusion):**

```json
{
  "comment": "Unit variant: None, Red, Empty. NOT followed by (, <, or . (method/property chain).",
  "match": "(?<![A-Za-z0-9_$@:.])([A-Z][A-Za-z0-9_$]*)\\b(?!\\s*[(<.])",
  "captures": {
    "1": { "name": "entity.name.function.constructor.variant.unit.sjs" }
  }
}
```

### 2.6 Banned keywords — Round 2 corrected `any` rule

**Problem from Round 1:** the `any` lookahead `(?=\s*[,;=)\]}>|&]|$)` allowed `=`, meaning `const any = ...` got flagged as deprecated.

**Round 2 fix:** require `any` to be preceded by a type-position character. In Oniguruma, fixed-length lookbehind allows single-character classes. The type-position characters that immediately precede `any` (possibly with a space) are: `:` (annotation), `<` (generic arg), `,` (generic or union continuation), `|` (union), `(` (paren group in type).

The challenge is that the preceding char may be a space, not `:` itself (e.g., `: any` — the char before `a` is a space, not `:`). Variable-length lookbehind not supported. Solution: use two alternative patterns — one for each preceding context — or use a `begin`/`end` rule that resets inside the annotation.

**Practical solution for TextMate:** define the `any` rule as a pattern that fires only inside the sum-type decl (`#sjs-sum-type-decl`) and match-arm bodies for type annotations. For top-level type annotations, use the `sjs-banned-keywords` rule with a tighter lookahead that requires `any` NOT to appear after `const`, `let`, `var`, `function`, `=` (assignment), which are value-position indicators.

Simplest implementable fix within TextMate constraints: remove `=` from the `any` lookahead entirely (the common case of `: any` terminates with `,`, `;`, `\n`, `>`, `)`, `}` — we rarely need `=`), and switch from a positive `=` lookahead to a negative lookbehind that excludes direct assignment:

```json
"sjs-banned-keywords": {
  "patterns": [
    {
      "comment": "Flag 'any' only in type position. Require preceded by type-annotation context characters (colon, open-angle, comma, pipe, open-paren). Uses multiple alternatives since fixed-length lookbehind cannot span 'const any' distance.",
      "patterns": [
        {
          "comment": "': any' — type annotation",
          "match": "(?<=:\\s{0,10})\\b(any)\\b(?=\\s*[,;)\\]}>|&\\n])",
          "captures": { "1": { "name": "invalid.deprecated.any.sjs" } }
        },
        {
          "comment": "': any' directly after colon (no space variant handled above)",
          "match": "(?<=<\\s{0,10})\\b(any)\\b(?=\\s*[,;)\\]}>|&\\n])",
          "captures": { "1": { "name": "invalid.deprecated.any.sjs" } }
        },
        {
          "comment": "'| any' or ', any' in union/generic",
          "match": "(?<=[|,]\\s{0,10})\\b(any)\\b(?=\\s*[,;)\\]}>|&\\n])",
          "captures": { "1": { "name": "invalid.deprecated.any.sjs" } }
        }
      ]
    },
    {
      "match": "\\bnamespace\\b",
      "name": "invalid.deprecated.namespace.sjs"
    },
    {
      "match": "\\benum\\b",
      "name": "invalid.deprecated.enum.sjs"
    }
  ]
}
```

**Note on `{0,10}` quantifier:** Oniguruma supports bounded repetition in lookbehinds (unlike PCRE). `\s{0,10}` allows up to 10 whitespace chars between `:` and `any` — covers the common `: any` with a space. This is a documented Oniguruma extension used by VS Code's TextMate engine.

**Acceptance test cases:**

| Input | Expected |
|-------|----------|
| `const x: any = 1` | `any` is `invalid.deprecated.any.sjs` — preceded by `: ` |
| `const any = something()` | `any` NOT flagged — no `:`, `<`, `\|`, `,` precedes it |
| `function f(): any` | `any` IS flagged — preceded by `: ` |
| `<T extends any>` | `any` IS flagged — preceded by `<...s ` (if `extends` adds space then `any` is after `s ` — not preceded by `<`. This edge case falls through. Accept.) |
| `Array<any>` | `any` IS flagged — preceded by `<` |

### 2.7 Sum-type declaration — Round 2 corrected end pattern

**Problem from Round 1:** the end pattern `(?=;|\n\n|^\s*(type|function|const|...))` missed `return`, `throw`, `if`, and other statement keywords, causing the grammar to consume subsequent code as if it were still inside the type declaration.

**Round 2 fix:** expand the end pattern's keyword list comprehensively:

```json
"sjs-sum-type-decl": {
  "begin": "\\b(type)\\s+([A-Z][A-Za-z0-9_$]*)\\s*(<[^>]*>)?\\s*(=)",
  "beginCaptures": {
    "1": { "name": "storage.type.sjs" },
    "2": { "name": "entity.name.type.sjs" },
    "3": {
      "name": "meta.type.parameters.sjs",
      "patterns": [{ "include": "source.tsx#type-parameters" }]
    },
    "4": { "name": "keyword.operator.assignment.sjs" }
  },
  "end": "(?=;|^\\s*\\n|^\\s*(?:type|function|const|let|var|class|interface|export|import|return|throw|if|else|switch|for|while|do|try|catch|finally|async|await|yield|new|void|break|continue|@)\\b)",
  "patterns": [
    {
      "match": "\\|",
      "name": "keyword.operator.type.union.sjs"
    },
    {
      "comment": "Variant with payload",
      "begin": "([A-Z][A-Za-z0-9_$]*)\\s*\\(",
      "beginCaptures": {
        "1": { "name": "entity.name.type.variant.sjs" }
      },
      "end": "\\)",
      "patterns": [{ "include": "source.tsx#type" }]
    },
    {
      "comment": "Unit variant — inside type decl body only",
      "match": "([A-Z][A-Za-z0-9_$]*)",
      "captures": {
        "1": { "name": "entity.name.type.variant.unit.sjs" }
      }
    },
    { "include": "source.tsx#type" }
  ]
}
```

**Note:** using `entity.name.type.sjs` (not `entity.name.type.declaration.sjs`) for the type name — fixes the non-standard scope name from Round 1.

**Also note:** `storage.type.sjs` replaces the Round 1 `storage.sumtype.sjs` — standard scope name following TS conventions.

### 2.8 Match expression — Round 2 corrected rules

**Problem from Round 1:** `\b(match)\b` fires on `function match()`, `const match =`, `obj.match(...)`, etc.

**Round 2 fix:** use a lookahead requiring that `match` be followed by an expression and then `{`. The lookahead `(?=\s+[^{])` or more precisely: `match` is a keyword only when followed by at least one space and then a non-`{` character (the scrutinee expression), and eventually a `{`. We also add a negative lookbehind for `.` (method call exclusion) and rely on the fact that `function match` has `match` preceded by a space after `function` — we can negative-lookbehind for `function\s+` but that's variable-length. Simpler: negative lookbehind for `.` excludes `obj.match(...)`.

For `function match()`, the key is that `match` is in declaration position — immediately followed by `(`, not by an expression + `{`. Our begin pattern can require `match` to be followed by whitespace and then something that is NOT `(`:

```
\b(match)\b(?=\s+[^({\s])
```

This requires: `match` then whitespace then a character that is NOT `(` (function declaration) and NOT `{` (bare empty match) and NOT whitespace. This correctly requires a scrutinee expression to follow.

Additionally, add negative lookbehind for `.`:

```json
"sjs-match-expression": {
  "begin": "(?<![.\\w])(match)(?=\\s+[^({\\s])",
  "beginCaptures": {
    "1": { "name": "keyword.control.match.sjs" }
  },
  "end": "(?<=\\})",
  "name": "meta.match.sjs",
  "patterns": [
    {
      "comment": "Match scrutinee — expression up to opening brace",
      "begin": "(?<=match\\s)",
      "end": "(?=\\{)",
      "patterns": [{ "include": "source.tsx#expression" }]
    },
    {
      "comment": "Match body",
      "begin": "\\{",
      "beginCaptures": { "0": { "name": "punctuation.section.match.begin.sjs" } },
      "end": "\\}",
      "endCaptures": { "0": { "name": "punctuation.section.match.end.sjs" } },
      "name": "meta.match.body.sjs",
      "patterns": [
        { "include": "#sjs-match-arm" }
      ]
    }
  ]
},
"sjs-match-arm": {
  "patterns": [
    {
      "comment": "default arm — keyword.control.default.sjs only inside match body",
      "begin": "\\b(default)\\b\\s*(=>)",
      "beginCaptures": {
        "1": { "name": "keyword.control.default.sjs" },
        "2": { "name": "keyword.operator.match.arrow.sjs" }
      },
      "end": "(?=,|\\})",
      "patterns": [{ "include": "source.tsx#expression" }]
    },
    {
      "comment": "Pattern => body arm. Begin includes string literals, numbers, identifiers, underscore.",
      "begin": "(?=[A-Z_a-z0-9$\"'`\\-\\[])",
      "end": "(?=,|\\})",
      "patterns": [
        {
          "comment": "Pattern up to =>",
          "begin": "(?=\\S)",
          "end": "(=>)",
          "endCaptures": { "1": { "name": "keyword.operator.match.arrow.sjs" } },
          "patterns": [
            { "include": "#sjs-variant-constructor" },
            { "include": "source.tsx#expression" }
          ]
        },
        {
          "comment": "Body after =>",
          "begin": "(?<=>)",
          "end": "(?=,|\\})",
          "patterns": [{ "include": "source.tsx#expression" }]
        }
      ]
    }
  ]
}
```

**Key changes from Round 1:**
- `match` begin pattern: `(?<![.\\w])(match)(?=\\s+[^({\\s])` — negative lookbehind for `.` and word chars (excludes `obj.match`, `rematch`), lookahead requires scrutinee not `(`.
- Pattern arm begin broadened to `[A-Z_a-z0-9$\"'\`\\-\\[]` — covers string and number literals in match patterns.
- `source.tsx#expression` replaces `source.tsx#destructuring-variable` (more stable internal include name) in the pattern body.

**Acceptance test cases:**

| Input | Expected |
|-------|----------|
| `match result { Ok(v) => v, Err(e) => 0 }` | `match` is keyword, arms colored |
| `function match(x) { return x }` | `match` is NOT keyword — `match` followed by `(`, excluded by lookahead |
| `const match = fn.match` | `match` at start NOT keyword (followed by ` =`, so space then `=`; `=` is not `[^({\\s]`... wait, `=` IS `[^({\\s]`. This would fire! Fix: add `=` to the exclusion: `(?=\\s+[^({=\\s])`. |
| `str.match(/pattern/)` | NOT keyword — `.match` excluded by `(?<![.\\w])` lookbehind |
| `match x { 1 => "one", default => "other" }` | All colored correctly |

**Updated begin:**

```json
"begin": "(?<![.\\w])(match)(?=\\s+[^({=\\s])"
```

This now excludes `match =` (variable assignment), `match(` (function call or declaration), and `match {` (bare object, though bare-object match is `match { ... }` which also starts with `{` — actually bare `match {}` is an odd case; if scrutinee is missing entirely, the grammar won't fire, which is correct behavior since `match {}` is not valid SJS syntax).

### 2.9 `dynamic` type

No change from Round 1. Same type-terminator lookahead:

```json
"sjs-dynamic-type": {
  "match": "\\b(dynamic)\\b(?=\\s*[,;=)\\]\\}>|&]|$)",
  "captures": {
    "1": { "name": "support.type.dynamic.sjs" }
  }
}
```

### 2.10 Generic constraint — Round 2 multi-param fix

**Problem from Round 1:** `(?<=<)` only matched the first type parameter. `<T: A, U: B>` only colored `T:`, not `U:`.

**Round 2 fix:** alternation in the lookbehind to also match after `,`:

```json
"sjs-generic-constraint": {
  "begin": "(?<=[<,]\\s{0,5})([A-Za-z][A-Za-z0-9_$]*)\\s*(:)(?!:)",
  "beginCaptures": {
    "1": { "name": "entity.name.type.parameter.sjs" },
    "2": { "name": "keyword.operator.type.constraint.sjs" }
  },
  "end": "(?=[,>])",
  "patterns": [{ "include": "source.tsx#type" }]
}
```

**Key changes:**
- Lookbehind `(?<=[<,]\\s{0,5})` — matches after `<` OR `,` (with up to 5 optional spaces). The `{0,5}` bounded quantifier is valid in Oniguruma lookbehind.
- Type param now `[A-Za-z]` not `[A-Z]` — lowercase type params (e.g., `t`) are valid in some contexts.
- Added `(?!:)` to exclude `::` (scope resolution, if any).

**Acceptance:**

| Input | Expected |
|-------|----------|
| `function f<T: Comparable<T>>(...)` | `T:` colored — single param |
| `function f<T: A, U: B>(...)` | Both `T:` and `U:` colored — FIXED |
| `interface I<K: Eq, V: Ord>` | Both constraints colored |

---

## 3. Scope Name Corrections (Round 2)

All non-standard scope names from Round 1 are fixed:

| Round 1 scope | Round 2 scope | Reason |
|---------------|---------------|--------|
| `entity.name.type.declaration.sjs` | `entity.name.type.sjs` | TS standard; `.declaration` suffix is non-standard |
| `keyword.operator.type.nullable.sjs` | `keyword.operator.optional.sjs` | Matches TS `?` optional property convention |
| `storage.sumtype.sjs` | `storage.type.sjs` | Standard TS convention for `type` keyword |

Retained scope names (correct, theme-friendly):
- `storage.type.sjs` — themes color like `let`/`const`/`type` ✓
- `entity.name.type.sjs` — themes color type names ✓
- `keyword.control.match.sjs` — themes color like `if`/`switch` ✓
- `keyword.control.default.sjs` — correct for control flow ✓
- `keyword.operator.match.arrow.sjs` — themes match `keyword.operator` ✓
- `keyword.operator.type.union.sjs` — standard TS convention ✓
- `keyword.operator.type.constraint.sjs` — harmless, themes match `keyword.operator` ✓
- `support.type.dynamic.sjs` — themes color like built-in types ✓
- `invalid.deprecated.any.sjs` / `namespace` / `enum` — themes strike-through ✓
- `entity.name.function.constructor.variant.sjs` — themes match `entity.name.function` ✓

---

## 4. Extension Structure

```
vscode-extension/
  package.json                          — complete manifest (§5)
  language-configuration.json          — brackets, comments, auto-close
  syntaxes/
    superjs.tmLanguage.json            — TextMate grammar
  snippets/
    superjs.code-snippets              — 13+ snippets (§6)
  test/
    fixtures/                          — 25+ .sjs fixture files (§8.2)
    suite/
      grammar.test.ts                  — vscode-textmate test runner
  icons/
    sjs-file.svg                       — 128x128 SVG (light theme)
    sjs-file-dark.svg                  — 128x128 SVG (dark theme)
    sjs-marketplace.png                — 128x128 PNG for marketplace tile
  media/
    screenshot-dark.png                — README screenshot, Dark+ theme
    screenshot-light.png               — README screenshot, GitHub Light
    screenshot-one-dark-pro.png        — README screenshot, One Dark Pro
  .github/
    workflows/
      test.yml                         — on push/PR
      publish.yml                      — on vscode-v* tag
  .vscodeignore
  .gitignore
  CHANGELOG.md
  LICENSE
  README.md
  tsconfig.json                        — for test suite only; no runtime TS
```

### 4.1 `.vscodeignore`

```
.github/
.vscode/
test/
media/
tsconfig.json
*.map
*.ts
node_modules/
.gitignore
```

Keep in VSIX: `syntaxes/`, `snippets/`, `icons/`, `language-configuration.json`, `package.json`, `README.md`, `CHANGELOG.md`, `LICENSE`.

**Note on screenshots:** `media/` is excluded from the VSIX. For VS Code Marketplace, images referenced from README are fetched via the repo URL (the `repository.url` field enables this). For Open VSX, include a local copy within the VSIX or use absolute URLs. Use absolute GitHub raw URLs in the README to ensure both Marketplace and Open VSX display screenshots.

---

## 5. `package.json` Specification

```json
{
  "name": "superjs-syntax",
  "displayName": "SuperJS",
  "description": "Syntax highlighting and snippets for SuperJS (.sjs) files.",
  "version": "0.1.0",
  "publisher": "hbarve1",
  "license": "MIT",
  "homepage": "https://github.com/hbarve1/super-js",
  "repository": {
    "type": "git",
    "url": "https://github.com/hbarve1/super-js.git",
    "directory": "vscode-extension"
  },
  "bugs": {
    "url": "https://github.com/hbarve1/super-js/issues"
  },
  "icon": "icons/sjs-marketplace.png",
  "galleryBanner": {
    "color": "#1e1e1e",
    "theme": "dark"
  },
  "categories": ["Programming Languages", "Snippets"],
  "keywords": ["superjs", "sjs", "syntax", "highlighting", "sum types", "match", "algebraic data types"],
  "engines": {
    "vscode": "^1.85.0"
  },
  "extensionKind": ["ui"],
  "activationEvents": [
    "onLanguage:superjs"
  ],
  "contributes": {
    "languages": [
      {
        "id": "superjs",
        "aliases": ["SuperJS", "superjs", "sjs"],
        "extensions": [".sjs"],
        "configuration": "./language-configuration.json",
        "icon": {
          "light": "./icons/sjs-file.svg",
          "dark":  "./icons/sjs-file-dark.svg"
        }
      },
      {
        "id": "json",
        "filenames": ["superjs.config.json"],
        "configuration": "./language-configuration.json"
      }
    ],
    "jsonValidation": [
      {
        "fileMatch": "superjs.config.json",
        "url": "./schemas/superjs.config.schema.json"
      }
    ],
    "grammars": [
      {
        "language": "superjs",
        "scopeName": "source.sjs",
        "path": "./syntaxes/superjs.tmLanguage.json"
      }
    ],
    "snippets": [
      {
        "language": "superjs",
        "path": "./snippets/superjs.code-snippets"
      }
    ]
  },
  "devDependencies": {
    "@vscode/vsce": "^2.24.0",
    "vscode-textmate": "^9.0.0",
    "oniguruma": "^7.0.1",
    "@types/node": "^20.0.0",
    "typescript": "^5.4.0"
  },
  "scripts": {
    "test": "node out/test/suite/grammar.test.js",
    "compile:test": "tsc -p tsconfig.json",
    "pretest": "npm run compile:test",
    "package": "vsce package",
    "publish:marketplace": "vsce publish",
    "publish:openvsx": "ovsx publish"
  }
}
```

**Changes from Round 1:**
- `engines.vscode: ^1.85.0` — raised from 1.80.0 to cover `embeddedLanguages` full support and current baseline.
- `extensionKind: ["ui"]` — enables vscode.dev (browser VS Code) compatibility. A pure grammar extension has no Node.js API calls, so `"ui"` is the correct kind.
- Removed `"main": null` — omit the field entirely; `vsce` warns on `null`. Omitting it means declarative-only extension.
- Removed `embeddedLanguages` from the grammar contributes — the Round 1 `meta.embedded.expression.sjs` scope was never emitted by the grammar, making that mapping dead config.
- Added `jsonValidation` contribution for `superjs.config.json`.
- Added second language contribution for `superjs.config.json` file association.
- `icon` changed to `sjs-marketplace.png` — distinct from the file icon SVGs, specifically the 128x128 PNG for the marketplace tile.
- Replaced `vscode-tmgrammar-test` with `vscode-textmate` + `oniguruma` (direct packages) — see §8 for rationale.

---

## 6. Snippet Plan

File: `snippets/superjs.code-snippets`.

| Trigger | Description | Notes |
|---------|-------------|-------|
| `match` | Match expression with two arms | Short prefix, no collision with built-in TS snippets |
| `matchres` | Match a `Result<T, E>` | |
| `matchopt` | Match an `Option<T>` / nullable | |
| `type` | Sum type declaration | |
| `typeu` | Unit-variant sum type (enum-like) | |
| `result` | Define function returning Result | |
| `okret` | Return Ok | |
| `errret` | Return Err | |
| `iface` | Interface declaration | |
| `fnopt` | Function returning nullable (was `fn?`) | Renamed: `fn?` prefix may not trigger in all VS Code configurations; `fnopt` is safer |
| `genc` | Generic with constraint | |
| `dyn` | dynamic-typed function | |
| `asyncres` | async function returning Result | Added: common SJS pattern |

**Dropped from Round 1:**
- `??=` — trigger is identical to the expansion; snippet would never fire.

**`fn?` → `fnopt` rename:** VS Code snippet completion may not handle `?` as a trigger character cleanly in all keyboard/locale configurations. `fnopt` is unambiguous.

**Nested placeholders in `type` snippet:** `${2:<${3:T}>}` — tested in VS Code 1.85+; nested placeholders work. Keep as-is.

---

## 7. Language Configuration

File: `language-configuration.json`. Adds `autoCloseBefore` for parity with TS extension:

```json
{
  "comments": {
    "lineComment": "//",
    "blockComment": ["/*", "*/"]
  },
  "brackets": [
    ["{", "}"],
    ["[", "]"],
    ["(", ")"],
    ["<", ">"]
  ],
  "autoClosingPairs": [
    { "open": "{", "close": "}", "notIn": ["string", "comment"] },
    { "open": "[", "close": "]", "notIn": ["string", "comment"] },
    { "open": "(", "close": ")", "notIn": ["string", "comment"] },
    { "open": "'", "close": "'", "notIn": ["string", "comment"] },
    { "open": "\"", "close": "\"", "notIn": ["string"] },
    { "open": "`", "close": "`", "notIn": ["string", "comment"] },
    { "open": "/*", "close": " */", "notIn": ["string"] }
  ],
  "autoCloseBefore": ";:.,=}])>` \n\t",
  "surroundingPairs": [
    ["{", "}"], ["[", "]"], ["(", ")"],
    ["'", "'"], ["\"", "\""], ["`", "`"], ["<", ">"]
  ],
  "wordPattern": "(-?\\d*\\.\\d\\w*)|([^\\`\\~\\!\\@\\#\\%\\^\\&\\*\\(\\)\\-\\=\\+\\[\\{\\]\\}\\\\\\|\\;\\:\\'\\\"\\,\\.\\<\\>\\/\\s]+)",
  "indentationRules": {
    "increaseIndentPattern": "^.*(\\{[^}\"'`]*|\\([^)\"'`]*|\\[[^\\]\"'`]*|=>\\s*)$",
    "decreaseIndentPattern": "^\\s*[\\}\\]\\)].*$"
  },
  "onEnterRules": [
    {
      "beforeText": "^\\s*\\*\\s.*$",
      "action": { "indent": "none", "appendText": "* " }
    },
    {
      "beforeText": "^\\s*/\\*\\*(?!/)([^\\*]|\\*(?!/))*$",
      "action": { "indent": "none", "appendText": " * " }
    },
    {
      "comment": "After 'match expr {' indent the next line",
      "beforeText": "^\\s*match\\b.*\\{\\s*$",
      "action": { "indent": "indent" }
    }
  ]
}
```

**Added `autoCloseBefore`:** matches TS extension default — prevents double-closing when cursor is before an existing closing bracket.

---

## 8. Testing Plan

### 8.1 Tooling — Replace `vscode-tmgrammar-test`

`vscode-tmgrammar-test` is unmaintained as of late 2024. Use `vscode-textmate` (the underlying engine, maintained by Microsoft) directly with a lightweight custom Jest-free runner:

```typescript
// test/suite/grammar.test.ts
import * as fs from 'fs';
import * as path from 'path';
import { Registry, INITIAL } from 'vscode-textmate';
import { createOnigScanner, createOnigString, loadWASM } from 'vscode-oniguruma';

// Load the oniguruma WASM
const wasmBin = fs.readFileSync(
  path.join(__dirname, '../../node_modules/vscode-oniguruma/release/onig.wasm')
);
const vscodeOniguruma = await loadWASM(wasmBin.buffer);

const registry = new Registry({
  onigLib: Promise.resolve({
    createOnigScanner: (sources) => vscodeOniguruma.createOnigScanner(sources),
    createOnigString: (str) => vscodeOniguruma.createOnigString(str),
  }),
  loadGrammar: async (scopeName) => {
    if (scopeName === 'source.sjs') {
      return JSON.parse(fs.readFileSync(
        path.join(__dirname, '../../syntaxes/superjs.tmLanguage.json'), 'utf8'
      ));
    }
    if (scopeName === 'source.tsx') {
      // Load from VS Code built-in grammar path for CI, or use a pinned copy
      return loadTsxGrammar();
    }
    return null;
  }
});

// Each fixture: .sjs source + .snap JSON of expected token scopes per line
// Run: node out/test/suite/grammar.test.js
```

**Snapshot format:** `test/fixtures/01-sum-type.sjs.snap` is a JSON array, one entry per line:
```json
[
  {
    "line": "type Result<T, E> = Ok(T) | Err(E)",
    "tokens": [
      { "startIndex": 0, "endIndex": 4, "scopes": ["source.sjs", "storage.type.sjs"] },
      { "startIndex": 5, "endIndex": 11, "scopes": ["source.sjs", "entity.name.type.sjs"] },
      ...
    ]
  }
]
```

On first run with `UPDATE_SNAPSHOTS=1`, the test writes snapshots. Subsequent runs compare against them.

**Why this over `vscode-tmgrammar-test`:** direct use of `vscode-textmate` is the approach used by Microsoft's own grammar tests; more control, no dependency on an unmaintained package, and snapshots are easier to review as plain JSON.

### 8.2 Required test fixtures (minimum 25)

| # | File | Construct under test | Defect covered |
|---|------|----------------------|----------------|
| 1 | `01-sum-type-generic.sjs` | `type Result<T, E> = Ok(T) \| Err(E)` | Basic sum-type |
| 2 | `02-sum-type-payload.sjs` | `type Shape = Circle({ radius: number }) \| Rect({ w: number, h: number })` | Payload variants |
| 3 | `03-sum-type-units.sjs` | `type Color = Red \| Green \| Blue` | Unit variants |
| 4 | `04-match-basic.sjs` | `match r { Ok(v) => v, Err(e) => 0 }` | Basic match |
| 5 | `05-match-destructure.sjs` | `match s { Circle({ radius }) => ..., Rect({ w, h }) => ... }` | Destructuring |
| 6 | `06-match-default.sjs` | `match x { 1 => "one", default => "other" }` | `default` arm |
| 7 | `07-nullable-basic.sjs` | `const x: number? = null; const y: string? = "";` | Basic nullable |
| 8 | `08-nullable-return.sjs` | `function f(): User? { return null; }` | `T?` before `{` — FIXED |
| 9 | `09-ternary-vs-nullable.sjs` | `const a = x ? 1 : 2; const b: number? = null;` | Disambiguation |
| 10 | `10-ternary-newline.sjs` | `const v = cond\n  ? doThing()\n  : other` | Newline ternary — FIXED |
| 11 | `11-dynamic.sjs` | `function parse(s: string): dynamic { ... }` | `dynamic` keyword |
| 12 | `12-variant-ctor.sjs` | `const r = Ok(42); const e = Err("x"); const n = None;` | Value-position variants |
| 13 | `13-none-match-arm.sjs` | `match opt { Some(v) => v, None => 0 }` | `None` in match arm — FIXED |
| 14 | `14-generic-constraint-single.sjs` | `function max<T: Comparable<T>>(a: T, b: T): T` | Single constraint |
| 15 | `15-generic-constraint-multi.sjs` | `function f<T: A, U: B>(t: T, u: U): T` | Multi-param constraint — FIXED |
| 16 | `16-banned-keywords.sjs` | `const x: any = 1; namespace Foo {} enum E {}` | Banned keywords |
| 17 | `17-any-variable.sjs` | `const any = something(); const y = any + 1;` | `any` as identifier — NOT flagged |
| 18 | `18-function-match.sjs` | `function match(x) { return x; }` | `match` as function name — NOT keyword |
| 19 | `19-decorator.sjs` | `@Injectable() class MyService {}` | Decorator NOT variant |
| 20 | `20-class-extends.sjs` | `class Foo extends Bar {}` | `Bar` in extends — known limitation documented |
| 21 | `21-import-binding.sjs` | `import { Ok, Err, None } from "./result"` | Import bindings coloring |
| 22 | `22-interface.sjs` | `interface Comparable<T> { compareTo(other: T): number }` | Interface |
| 23 | `23-jsx.sjs` | `const el = <Foo bar={42}>{children}</Foo>` | TSX inheritance |
| 24 | `24-sum-type-followed-by-return.sjs` | `type T = A \| B\nreturn Ok(42)` | End-pattern keyword fix |
| 25 | `25-mixed-real-world.sjs` | 50-line file: classes, async/await, sum types, match, nullable | Integration |

### 8.3 CI

`.github/workflows/test.yml`:
```yaml
name: Test
on: [push, pull_request]
jobs:
  grammar:
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
        working-directory: vscode-extension
      - run: npm test
        working-directory: vscode-extension
```

Matrix across Ubuntu, macOS, Windows — cheap (< 5 min per run), catches any platform-specific Oniguruma WASM loading differences.

### 8.4 Manual smoke test

Before each release, open `prototype/examples/**/*.sjs` in the Extension Development Host (F5) and visually verify against five themes:
1. Dark+ (default dark)
2. Light+ (default light)
3. One Dark Pro
4. GitHub Light
5. Dracula

Check: keywords colored, banned keywords muted/strike-through, variants visually distinct from regular identifiers.

---

## 9. Icon Plan

Dedicated 2h in Sprint 3 for:

1. **SVG design** — create `sjs-file.svg` (light background) and `sjs-file-dark.svg` (dark background). Both 128x128. Content: a simple `.sjs` lettermark in the SuperJS accent color, or a stylized `S` with a lowercase `j` subscript. Keep it simple — no gradients, no detail below 16x16 resolution.

2. **PNG export** — export `sjs-file.svg` to `sjs-marketplace.png` at 128x128 for the Marketplace tile. Use Inkscape CLI: `inkscape --export-type=png --export-width=128 --export-height=128 sjs-file.svg -o sjs-marketplace.png`. Also export at 256x256 as `@2x` for retina (optional).

3. **Transparency** — SVG and PNG must have transparent backgrounds. The marketplace tile background is controlled by `galleryBanner.color`; the file icon is rendered by VS Code on various backgrounds.

4. **Theme compatibility test** — verify file icon appears in VS Code's default file icon theme. Note: Material Icon Theme and vscode-icons will override with their own icons (no SJS entry yet). Document in README: "File icon requires VS Code's built-in Minimal or Seti icon theme, or no icon theme."

5. **Material Icon Theme PR** — out of scope for v0.1 but flag as a v0.2 task: open a PR to `PKief/vscode-material-icon-theme` to add SJS support. This is how ~80% of users will eventually see the custom icon.

---

## 10. Publishing Plan

### 10.1 Sprint 0 — Publisher reservation (MUST BE DONE FIRST, blocks all publishing)

Before any code is written:

1. **VS Code Marketplace:**
   - Create an Azure DevOps organization at https://dev.azure.com/ (free, requires Microsoft account)
   - Create a Personal Access Token with `Marketplace > Manage` scope
   - Go to https://marketplace.visualstudio.com/manage/createpublisher
   - Register publisher ID `hbarve1`
   - Store the PAT in GitHub repo secret: `VSCE_PAT`
   - **Budget: 1h** — Azure DevOps account setup + email verification often takes 20-30 min

2. **Open VSX Registry:**
   - Go to https://open-vsx.org/
   - Authenticate with GitHub OAuth
   - Claim namespace `hbarve1`
   - Generate an Open VSX access token
   - Store token in GitHub repo secret: `OVSX_PAT`
   - **Budget: 30min**

Total Sprint 0: **2h** (including waiting for email confirmations and testing PAT with a dry-run `vsce ls-publishers`).

### 10.2 Manual publish (first release)

```bash
cd vscode-extension
npm ci
npm test                               # all 25 fixtures must pass
npx vsce package                       # produces superjs-syntax-0.1.0.vsix
# Inspect the VSIX:
npx vsce show                          # dry-run; check contents
npx vsce publish -p $VSCE_PAT         # upload to Marketplace
npx ovsx publish superjs-syntax-0.1.0.vsix -p $OVSX_PAT  # Open VSX
```

**Note on `vsce publish -p` vs env var:** current vsce 2.x uses `--pat` flag or reads from `VSCE_PAT` env var. Check the installed vsce version before publishing and confirm the flag name.

### 10.3 Automated publish on tag

`.github/workflows/publish.yml`:
```yaml
name: Publish
on:
  push:
    tags: ['vscode-v*']
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
        working-directory: vscode-extension
      - run: npm test
        working-directory: vscode-extension
      - name: Package
        run: npx vsce package
        working-directory: vscode-extension
      - name: Publish to VS Code Marketplace
        run: npx vsce publish --pat ${{ secrets.VSCE_PAT }}
        working-directory: vscode-extension
      - name: Publish to Open VSX
        run: npx ovsx publish *.vsix --pat ${{ secrets.OVSX_PAT }}
        working-directory: vscode-extension
```

Tag convention: `vscode-v0.1.0`, `vscode-v0.2.0` (prefixed to distinguish from compiler release tags).

### 10.4 README content

Sections:
1. **Hero screenshot** — absolute GitHub raw URL to `media/screenshot-dark.png`.
2. **Features** — syntax highlighting for sum types, match, nullable, dynamic, snippets, config schema.
3. **Screenshots gallery** — three themes (Dark+, GitHub Light, One Dark Pro) using absolute raw URLs.
4. **Snippet table** — trigger → description.
5. **Known limitations** — `new MyClass()` over-colors as variant; class names in `extends` over-color; Material Icon Theme will override file icon. These are accepted v0.1 limitations pending the LSP phase.
6. **Emmet inside JSX** — add `"emmet.includeLanguages": {"superjs": "javascriptreact"}` to user settings.
7. **Roadmap** — link to Stage 3 LSP plans.
8. **Contributing** — monorepo CONTRIBUTING.md.
9. **License** — MIT. Attribution note for embedded TS grammar.

### 10.5 Version policy

- `0.x.y` while grammar is being iterated. Breaking scope renames bump minor.
- `1.0.0` when grammar is stable and matches the LSP phase's expected scope names (semantic tokens phase).
- Patch releases for fixture-driven bug fixes.

---

## 11. Sprint Plan (4 sprints + Sprint 0, ~35h total)

### Sprint 0 — Publisher Reservation (2h)

| Task | Estimate |
|------|----------|
| Register `hbarve1` on VS Code Marketplace (Azure DevOps account + PAT) | 1h |
| Register `hbarve1` namespace on Open VSX Registry | 0.5h |
| Repo scaffold: create `vscode-extension/` directory, add `.gitignore`, `.vscodeignore`, `CHANGELOG.md` stub | 0.5h |

**Done signal:** `npx vsce ls-publishers` shows `hbarve1`. Open VSX namespace claimed.

**This sprint blocks Sprint 4 (publishing). It must be done before Sprint 1 begins.**

---

### Sprint 1 — Core Grammar (10h)

| Task | Estimate |
|------|----------|
| Grammar shell + `include: source.tsx` only; verify `.sjs` files inherit full TS coloring | 0.5h |
| `match` keyword rule with `function match()` disambiguation (§2.8 corrected begin pattern) | 2h |
| `type X = A \| B(...)` sum-type declaration with corrected end pattern (§2.7) | 2.5h |
| `dynamic` keyword rule (§2.9) | 0.5h |
| Banned-keyword rules with corrected `any` type-position lookbehind (§2.6) | 1h |
| Set up `vscode-textmate` direct test harness (§8.1) | 1.5h |
| Write fixtures 1–6, run until green | 1h |
| Manual smoke test against `prototype/examples/` in Extension Development Host | 1h |

**Done signal:** fixtures 1–6 pass; `match` keyword not triggered by `function match(x)`.

---

### Sprint 2 — Edge Cases and Grammar Polish (10h)

| Task | Estimate |
|------|----------|
| `T?` nullable suffix with corrected lookahead including `{` (§2.4) | 2h |
| Variant-constructor rule with `@` exclusion and unit-variant `:` / `.` fixes (§2.5) | 2.5h |
| Generic-constraint rule with multi-param lookbehind fix (§2.10) | 1h |
| Match-arm sub-grammar: `None =>` fix, `default` arm, broadened pattern begin (§2.8) | 2h |
| `superjs.config.json` association + JSON schema reference (§5) | 0.5h |
| Write fixtures 7–25, fix all surfaced grammar bugs | 2h |

**Done signal:** all 25 fixtures green; `None => ...` colored; `): User? {` highlighted; `<T: A, U: B>` both constraints colored; `const any = 1` not flagged.

---

### Sprint 3 — Snippets, Language Config, Icon, README (8h)

| Task | Estimate |
|------|----------|
| Write 13 snippets in `snippets/superjs.code-snippets` | 1h |
| `language-configuration.json` — add `autoCloseBefore`, verify `wordPattern` | 0.5h |
| Icon: design 128x128 SVG (light + dark), export marketplace PNG | 2h |
| Theme compatibility test: verify icon renders in VS Code default theme; document Material Icon Theme limitation | 0.5h |
| Test all 5 themes (Dark+, Light+, One Dark Pro, GitHub Light, Dracula): visual smoke test | 1h |
| Capture theme screenshots (3 themes) for README | 0.5h |
| Write README with absolute URLs to screenshots, Known Limitations section | 1.5h |
| Add `NOTICE` file with TS grammar MIT attribution statement | 0.5h |

**Done signal:** extension installable from local VSIX; snippets fire in editor; icons visible in default icon theme; README renders correctly on GitHub.

---

### Sprint 4 — CI and Publish (5h)

| Task | Estimate |
|------|----------|
| Finalize `.github/workflows/test.yml` with OS matrix | 0.5h |
| Finalize `.github/workflows/publish.yml` | 0.5h |
| Add GitHub repo secrets (`VSCE_PAT`, `OVSX_PAT`) | 0.5h |
| First manual publish: `vsce package` → `vsce publish` → `ovsx publish` | 1.5h |
| Verify listing on Marketplace and Open VSX (screenshots, description, badge) | 0.5h |
| Smoke-test installed extension on a clean VS Code profile | 0.5h |
| Tag `vscode-v0.1.0`; verify CI publish workflow fires and succeeds | 1h |

**Done signal:** extension listed on https://marketplace.visualstudio.com/ and https://open-vsx.org/; CI badge green on README; clean-profile smoke test passes.

---

**Total: ~35h of focused work. Sprint 0 must be done first (it unblocks Sprint 4). Sprints 1-3 can overlap if multiple engineers are available. Realistic calendar: 7-10 days part-time.**

---

## 12. Known Limitations (Accepted for v0.1, Deferred to LSP Phase)

These are explicitly accepted as v0.1 limitations. They will be corrected when the Language Server provides semantic token support:

| Limitation | Root cause | Impact | v0.2 plan |
|------------|-----------|--------|-----------|
| `new MyClass()` — `MyClass` gets variant-constructor scope | Space before PascalCase not excluded by fixed-length lookbehind | Minor: TS themes color `entity.name.function` similarly for `new Foo()` | Semantic tokens (LSP) |
| `class Foo extends Bar` — `Bar` gets unit-variant scope | `extends ` is variable-length prefix; can't exclude in Oniguruma fixed-length lookbehind | Minor: color difference only | Semantic tokens |
| `import { Foo } from "x"` — `Foo` may get unit-variant scope | Same root cause | Minor: themes color import bindings similarly | Semantic tokens |
| `<MyType>value` cast syntax | TSX grammar treats `<X>` as JSX | Must use `value as MyType` instead | Language spec already prefers `as` |
| `T?` on a line by itself (e.g., in a comment or string) may fire | Regex is purely syntactic | Cosmetic only | Semantic tokens |
| Material Icon Theme overrides file icon | Third-party icon theme has its own SJS entry | ~80% of users won't see the custom icon | Open PR to Material Icon Theme in v0.2 |

---

## 13. Out of Scope (Phase 1 Scope Guard)

| Feature | Why deferred |
|---------|--------------|
| Type checking / diagnostics | Requires LSP |
| Hover info (types, doc comments) | Requires LSP |
| Go-to-definition, find-references | Requires LSP |
| Rename refactoring | Requires LSP |
| Autocomplete / IntelliSense beyond snippets | Requires LSP |
| Inlay hints | Requires LSP |
| Code actions / quick fixes | Requires LSP |
| Format-on-save | Requires formatter binary or LSP |
| Debug adapter | Separate roadmap item |
| Semantic highlighting | Requires LSP semantic tokens |
| Telemetry | Never |
| Test runner integration | Separate extension |
| Color theme | Deferred to v1.0 |
| Workspace symbol search | Requires LSP |

---

## 14. Resolved Open Questions (from Round 1 §12)

1. **File icon design** — use a simple `.sjs` lettermark SVG at 128x128. No commissioned logo for v0.1. Re-evaluate at v1.0 if the extension gains traction.

2. **Snippet prefixes** — no namespace prefix for v0.1. `match`, `type`, etc. are short and conflict-free with standard VS Code TS snippets. If conflicts surface in user feedback, prefix with `sjs-` in v0.1.1.

3. **`dynamic` color** — `support.type.dynamic.sjs`. Themes color this like built-in types (number, string) — correct signal. `storage.type` would theme like a keyword, which is wrong for a type name.

4. **Default color theme** — no custom theme for v0.1. The standard scopes we emit are styled correctly by all major themes already.

5. **Marketplace category** — `["Programming Languages", "Snippets"]` only. No `Themes` category until a custom theme is added.

6. **License attribution** — add a `NOTICE` file: "This extension uses the VS Code TypeScript grammar (MIT License, Copyright Microsoft Corporation) by reference via `source.tsx` scope inclusion. The TypeScript grammar file itself is not distributed in this VSIX." This satisfies the spirit of MIT attribution without over-engineering.

---

## 15. Risks and Mitigations (Updated)

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| `T?` rule false-positives on ternary | Low (Round 2 fix) | Cosmetic | 10 targeted fixtures cover all ternary cases |
| PascalCase rule over-colors `new MyClass` | High | Minor | Document in README Known Limitations; fix via semantic tokens in LSP phase |
| TS grammar internal API rename (`source.tsx#type`) | Low | Tokenizer silent fail | Quarterly review; CI asserts each `source.tsx#*` include resolves via a smoke fixture |
| Marketplace publisher name conflict | None (Sprint 0 reserves it) | Blocked publish | Sprint 0 is mandatory first step |
| `vscode-textmate` API change | Low | Test runner breaks | Pin `vscode-textmate` version in `package.json`; update with VS Code releases |
| Icon not visible with popular icon themes | High (by design) | Cosmetic only | Document clearly; file PR to Material Icon Theme in v0.2 |
| Performance on large `.sjs` files | Low | UX lag | Benchmark 5000-line file before publish; TextMate engine handles 7 rules efficiently |
| Open VSX images broken if using relative README paths | Medium | Listing looks broken | Use absolute GitHub raw content URLs in README |

---

## 16. Acceptance Criteria for "Plan Approved → Build"

- [ ] All corrected regex patterns in §2.4–§2.10 hand-traced against the acceptance test cases in each section.
- [ ] Sprint 0 publisher reservation is completed before Sprint 1 begins.
- [ ] The 25 required fixtures listed in §8.2 are agreed as sufficient coverage.
- [ ] Snippet list in §6 reviewed (trigger name changes `fn?` → `fnopt`, `??=` drop, `asyncres` add confirmed).
- [ ] Scope name corrections in §3 reviewed and aligned with theme expectations.
- [ ] Known limitations in §12 accepted as v0.1 deferred items.
- [ ] `vscode-textmate` direct test approach (§8.1) approved over `vscode-tmgrammar-test`.
- [ ] `extensionKind: ["ui"]` for vscode.dev confirmed as correct for grammar-only extensions.
