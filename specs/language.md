# SuperJS Language Specification

**Version:** 1.0  
**Status:** FROZEN  
**Frozen:** 2026-06-24  
**Frozen-at:** `d0941d5`

> This document is the canonical language reference for SuperJS 1.0.
> It was assembled from per-feature sections authored across Stages 1–5
> and frozen at v1.0. Changes after this point require a "spec exception"
> (written approval from all maintainers) plus an RFC for v1.1+.
> See [docs/deprecation.md](../docs/deprecation.md) for the stability policy.

**Grammar:** [`specs/grammar.ebnf`](./grammar.ebnf)  
**Error registry:** [`specs/error-codes.md`](./error-codes.md)  

---

## Table of Contents

- [1. Lexical structure](#1-lexical-structure)
- [2. Syntax](#2-syntax)
- [3. Type system](#3-type-system)
- [4. Code generation semantics](#4-codegen-semantics)
- [5. CLI surface](#5-cli-surface)
- [6. Incremental compilation model](#6-incremental-model)
- [7. Interop with TypeScript](#7-interop)
- [8. Tooling surface](#8-tooling-surface)
- [9. Standard library](#9-stdlib)
- [10. Build tool integration](#10-build-tools)
- [Appendix A. Diagnostic codes map](#appendix-diagnostics)

---

## 1. Lexical structure {#1-lexical-structure}

> **Grammar:** § Identifiers and Keywords, § Literals — see [`specs/grammar.ebnf`](./grammar.ebnf)  
> **Errors:** SJS-P001–SJS-P005 — see [`specs/error-codes.md`](./error-codes.md)

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


# 000 — Keywords

**Status:** Stage 0 — authoritative reference  
**Grammar:** `specs/grammar.ebnf` § Identifiers and Keywords

Every token that SJS treats as a keyword, reserved word, banned identifier, or
contextual keyword. Grouped by origin and enforcement level. This file is the
single source of truth — all other language feature specs reference keyword names
from here.

---

## 1. SJS-New Keywords

Keywords that do not exist in JavaScript or TypeScript. Unique to SJS.

| Keyword | Category | Grammar production | Purpose |
|---------|----------|--------------------|---------|
| `dynamic` | type + expression | `<PrimitiveType>` | Runtime-checked escape hatch; replaces banned `any`. Propagates: `dynamic op T` → `dynamic`. Warns in `--strict`. |
| `match` | expression | `<MatchExpression>` | Exhaustive pattern-matching over sum-type values. `match expr { Pattern => body, ... }`. Compiler error if arms are not exhaustive and no `default` arm. |

> **Note on `fn`:** Language highlight docs use `fn` as a shorthand for `function`. As of grammar v0.1, the grammar uses `function`. `fn` is reserved for inclusion as an official alias in Stage 1. Do not implement as an alias until grammar.ebnf is updated.

---

## 2. JS Inherited — Hard Reserved

Cannot appear as an identifier anywhere. Exact ECMAScript semantics apply unless
an SJS rule narrows or extends behaviour (see linked feature spec).

| Keyword | ECMA-262 § | SJS notes |
|---------|-----------|-----------|
| `break` | §14.9 | Unchanged |
| `case` | §14.12 | Unchanged. Also valid inside `match` arms (contextual — see §5) |
| `catch` | §14.15 | Optional binding: `catch { }` valid (ES2019). Type annotation on binding: `catch (e: Error)` |
| `class` | §15.7 | SJS adds access modifiers, `abstract`, typed fields. See `022-classes.md` |
| `const` | §14.3.1 | SJS linter `SJS-L001` warns when `let` should be `const` |
| `continue` | §14.8 | Unchanged |
| `debugger` | §14.16 | Unchanged; SJS linter `SJS-L005` warns on committed `debugger` |
| `default` | §14.12 / §16.2.3 | Also catch-all arm in `match`; also default export |
| `delete` | §13.5.1 | Unchanged; type-checker narrows result to `boolean` |
| `do` | §14.7.3 | `do...while` only |
| `else` | §14.6 | Unchanged |
| `export` | §16.2.3 | ES module export. `export type { }` for type-only exports (erased at compile). See `023-modules.md` |
| `extends` | §15.7.1 | Class inheritance only. **Banned in type-parameter constraints** (no `T extends U`). See §6. |
| `false` | §12.9.2 | Boolean literal |
| `finally` | §14.15 | Unchanged |
| `for` | §14.7.4–5 | `for`, `for...of`, `for...in`, `for await...of`. Typed binding in `for...of`: `for (x: T of arr)`. See `042-for-of-for-in.md` |
| `function` | §15.2 | Declaration + expression. `async function`, `function*`, `async function*`. See `021-functions.md` |
| `if` | §14.6 | Unchanged |
| `import` | §16.2.2 | Static import, `import type { }`, dynamic `import()`. See `023-modules.md` |
| `in` | §13.10.1 | Relational operator (key membership). Also `for...in` |
| `instanceof` | §13.10.2 | Unchanged; type-checker narrows to the constructor type |
| `let` | §14.3.1 | Block-scoped mutable binding |
| `new` | §13.3.5 | Constructor call. `new.target` meta-property. See §5 for `new.target` |
| `null` | §6.1.2 | Null literal; part of `T?` = `T \| null \| undefined` |
| `return` | §14.10 | Unchanged |
| `static` | §15.7.1 | Class static fields, methods, static blocks |
| `super` | §13.3.7 | Class `super()` call and `super.member` access |
| `switch` | §14.12 | `switch (expr) { case ...: }`. See `040-control-flow.md`. SJS recommends `match` over `switch` for sum types |
| `this` | §13.3.1 | Receiver reference; `this: T` parameter annotation supported |
| `throw` | §14.14 | Unchanged |
| `true` | §12.9.2 | Boolean literal |
| `try` | §14.15 | `try / catch / finally`. See `041-try-catch.md` |
| `typeof` | §13.5.3 | Unary type-inspection operator. **Banned in type positions** (`typeof x` as a type is rejected). |
| `undefined` | — | Treated as a reserved literal in SJS. `undefined` is a valid type. Cannot be used as an identifier. |
| `var` | §14.3.2 | Function-scoped; valid for ES5-compatible SJS. SJS linter `SJS-L002` warns: prefer `let`/`const` |
| `void` | §13.5.2 | Unary operator. Also the `void` return type. |
| `while` | §14.7.2 | `while (cond) body` |
| `with` | §14.11 | Forbidden in strict mode. SJS always compiles in strict mode; `with` always emits SJS-E013. |
| `yield` | §15.5.3 | Inside `function*`. `yield expr`, `yield* iterable`. Type: `Generator<YieldType, ReturnType, NextType>`. See `038-generators.md` |

---

## 3. JS Inherited — Contextual

Valid as identifiers in most syntactic positions; treated as keywords only in
specific grammatical contexts. Exact contexts listed.

| Keyword | Keyword context | Identifier context | SJS notes |
|---------|-----------------|--------------------|-----------|
| `async` | Before `function` or arrow `=>` | Valid identifier | `async function`, `async () =>`. See `037-async-await.md` |
| `await` | Inside `async function` body; top-level module | Valid identifier outside async context | SJS treats top-level `await` as valid in modules (ES2022) |
| `get` | Object/class getter: `get prop()` | Valid identifier | Unchanged |
| `set` | Object/class setter: `set prop(v)` | Valid identifier | Unchanged |
| `from` | `import ... from "..."` | Valid identifier | Contextual in import/export only |
| `of` | `for (x of iterable)` | Valid identifier | Contextual in `for...of` only |
| `as` | `import X as Y`, `export X as Y`, `expr as Type` | Valid identifier | Also used in `as` type cast expression |
| `target` | `new.target` (meta-property) | Valid identifier elsewhere | `new.target` is valid only inside functions/constructors |
| `meta` | `import.meta` (meta-property) | Valid identifier elsewhere | `import.meta` is valid only in ES module context |

---

## 4. TypeScript-Borrowed — Active

TypeScript keywords SJS adopts. Semantics match TypeScript unless an SJS rule
restricts them further.

| Keyword | Category | SJS behaviour | Feature spec |
|---------|----------|---------------|--------------|
| `abstract` | class modifier | Abstract classes and methods. Concrete subclass must implement abstract members. | `022-classes.md` |
| `as` | expression | Type assertion: `expr as T`. Only safe cast form in SJS (no `<T>expr` prefix cast). | `016-type-narrowing.md` |
| `declare` | declaration modifier | Ambient declarations: `declare const x: T`. Emitted as nothing. Used in `.d.sjs` files. | `023-modules.md` |
| `interface` | declaration | Structural interface definition. Conformance is structural (no explicit `implements`). See §4 note. | `006-interfaces.md` |
| `readonly` | property modifier | Immutable property; cannot be written after construction. Enforced at type level only. | `014-object-types.md` |
| `type` | declaration / import/export modifier | Type alias (`type Alias = T`) and type-only import/export (`import type`, `export type`). | `010-primitives.md` |

> **Note on `implements`:** Grammar comment explicitly excludes `implements` — conformance is structural. `implements` is not a keyword in SJS. A class satisfies an interface if it structurally provides all required members. No keyword required.

---

## 5. Type-Position Keywords

Valid only in type annotation positions (after `:` or in `<TypeArguments>`).
Using these as value-position expressions emits a parse error or is interpreted
differently (see notes).

| Keyword | Type meaning | Value-position behaviour |
|---------|-------------|--------------------------|
| `number` | Number type | Not a value (no `Number` auto-import). Use `Number` constructor explicitly |
| `string` | String type | Not a value |
| `boolean` | Boolean type | Not a value |
| `bigint` | BigInt type | Not a value |
| `symbol` | Symbol type | Not a value; `Symbol()` constructor is separate |
| `void` | No return value | `void expr` (operator) evaluates `expr` and returns `undefined` |
| `null` | Null type | `null` literal is both a type and a value |
| `undefined` | Undefined type | `undefined` is both a type and a value in SJS (reserved identifier) |
| `never` | Uninhabited type — no value can have this type | Not a value |
| `unknown` | Top type — any value; must narrow before use | Not a value |
| `object` | Non-primitive object type | Not a value; use `{}` or a specific interface |
| `dynamic` | Runtime-checked escape hatch | Also a value qualifier: `dynamic` propagates through operations |

---

## 6. Banned Keywords

Compiler emits a hard error when any of these appear. No valid SJS program uses them.

| Keyword | Error code | Reason | SJS alternative |
|---------|-----------|--------|-----------------|
| `any` | SJS-E004 | Silent unsafety; allows unchecked assignment to/from all types | `dynamic` — explicit runtime-checked escape hatch |
| `enum` | SJS-E010 | Dual-valued (type + value), non-tree-shakeable, poor performance | Sum types: `type Direction = North \| South \| East \| West` |
| `namespace` | SJS-E012 | Module bundling antipattern; collides with ES module system | ES module `import`/`export` |
| `infer` | SJS-E009 | Conditional type inference; makes type checking undecidable in practice | Explicit type parameters and aliases |

**Additionally banned in type positions:**

| Construct | Error code | Reason | SJS alternative |
|-----------|-----------|--------|-----------------|
| `A & B` (intersection) | SJS-E005 | Produces structurally unverifiable merged types | Separate named interfaces + structural conformance |
| `T extends U ? A : B` (conditional) | SJS-E008 | Turing-complete types; compile-time non-termination risk | Explicit overloads or union narrowing |
| `{ [K in keyof T]: ... }` (mapped) | SJS-E006 | Unpredictable shape; blocks monomorphic optimization | Named type aliases with explicit members |
| `T['key']` (indexed access) | SJS-E006 | Dependent types; blocks inference | Named type aliases |
| `x!` (non-null assertion postfix) | SJS-E011 | Silently discards null/undefined; spreads unsafety | `?.` optional chaining, explicit null check, or `match` |
| `typeof x` in type position | SJS-E006 | Structural inference bypass | Explicit type alias |

---

## 7. SJS-Reserved (Future)

These identifiers are reserved for planned SJS language extensions. Using them
as identifiers today emits `SJS-W004` (reserved-identifier warning, not an error).
They will become hard keywords in a future stage.

| Keyword | Planned use | Stage |
|---------|------------|-------|
| `where` | Constraint clause in generic declarations (alternative to banned `extends`) | Stage 2+ |
| `effect` | Algebraic effect syntax (long-term research) | Post-1.0 |
| `region` | Memory region annotations for LLVM backend | LLVM stage |
| `struct` | Value-type struct declarations (stack-allocated) | Post-1.0 |

---

## 8. Banned Syntactic Forms (Operator-level)

These are not keywords but operator uses that SJS rejects.

| Form | Error code | Reason |
|------|-----------|--------|
| `==` (abstract equality) | SJS-L003 | Coercion-based; use `===` |
| `!=` (abstract inequality) | SJS-L003 | Coercion-based; use `!==` |
| `with` statement | SJS-E013 | Dynamic scope; banned in strict mode. SJS always strict. |
| `x!` postfix | SJS-E011 | Non-null assertion; see §6 |
| `<T>expr` type cast prefix | parse error | Use `expr as T` |

---

## 9. Keyword → Feature Spec Cross-Reference

| Keyword(s) | Feature spec |
|------------|-------------|
| `dynamic` | `001-null-safety.md`, `004-dynamic.md` |
| `match` | `003-match.md` |
| `type` (sum type form) | `002-sum-types.md` |
| `null`, `undefined`, `T?` | `001-null-safety.md` |
| `interface`, structural conformance | `006-interfaces.md` |
| `abstract`, access modifiers | `022-classes.md` |
| `import`, `export`, `from`, `as`, `declare` | `023-modules.md` |
| `async`, `await` | `037-async-await.md` |
| `yield`, `function*` | `038-generators.md` |
| `never`, `unknown`, `void` | `010-primitives.md` |
| `as` (cast) | `016-type-narrowing.md` |
| `readonly` | `014-object-types.md` |
| banned: `any`, `enum`, `namespace`, `infer`, `&`, `?:` | `007-banned-features.md` |
| `typeof`, `instanceof`, `in` (narrowing) | `016-type-narrowing.md` |

---

## Appendix A — Complete Reserved Word List

Full list as declared in `grammar.ebnf` §Identifiers and Keywords:

```
abstract  as        async     await     break     case      catch
class     const     continue  debugger  declare   default   delete
do        dynamic   else      export    extends   false     finally
for       from      function  get       if        import    in
instanceof  interface  let    match     meta      new       null
object    of        readonly  return    set       static    super
switch    target    this      throw     true      try       type
typeof    undefined  var      void      while     with      yield
```

Banned (parsed but immediately rejected):

```
any   enum   infer   namespace
```

SJS-Reserved (warning if used as identifier):

```
where   effect   region   struct
```


---

## 2. Syntax {#2-syntax}

> **Grammar:** <Program>, <Statement>, <Expression> productions — see [`specs/grammar.ebnf`](./grammar.ebnf)  
> **Errors:** SJS-P*, SJS-E013–SJS-E018 — see [`specs/error-codes.md`](./error-codes.md)

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


# 020 — Variables

**Status:** Stage 1 — implemented
**Grammar:** `specs/grammar.ebnf` §VariableDecl, §VariableKind, §VariableDeclarator, §BindingPattern

---

## Syntax

```ebnf
<VariableDecl>       ::= <VariableKind> <VariableDeclarator>
                         { "," <VariableDeclarator> } ";"

<VariableKind>       ::= "const" | "let" | "var"

<VariableDeclarator> ::= <BindingPattern> [ ":" <Type> ] [ "=" <Expression> ]

<BindingPattern>     ::= <Identifier>
                       | <ArrayBindingPattern>
                       | <ObjectBindingPattern>

<ArrayBindingPattern>  ::= "[" [ <ArrayBindingElement>
                               { "," <ArrayBindingElement> }
                               [ "," "..." <Identifier> ] ] "]"

<ArrayBindingElement>  ::= <BindingPattern> [ ":" <Type> ] [ "=" <Expression> ]

<ObjectBindingPattern> ::= "{" [ <ObjectBindingElement>
                                { "," <ObjectBindingElement> }
                                [ "," "..." <Identifier> ] ] "}"

<ObjectBindingElement> ::= <Identifier> [ ":" <BindingPattern> ]
                           [ ":" <Type> ] [ "=" <Expression> ]
```

---

## Semantics

### `const`

A `const` declaration is block-scoped. It must have an initializer; omitting `=` is a syntax error. The binding itself cannot be reassigned after initialization — a subsequent assignment to the variable name is a type error (SJS-E001). The value the binding points to is not frozen: properties of an object or elements of an array bound with `const` remain mutable.

### `let`

A `let` declaration is block-scoped. The initializer is optional; if omitted, the binding holds `undefined` until the first assignment. The binding may be reassigned any number of times. A type annotation on a `let` declaration without an initializer fixes the binding's declared type; accessing the variable before its first assignment in strict mode is SJS-E016.

### `var`

A `var` declaration is function-scoped (or global-scoped at the top level). The binding is hoisted to the top of the enclosing function: the name is visible throughout the function body regardless of where the declaration appears. `var` is syntactically valid in SJS but every occurrence emits SJS-L002, directing the author to prefer `let` or `const`. The compiler does not reject `var`; the diagnostic is a linting warning.

### Temporal Dead Zone (TDZ)

`let` and `const` bindings exist from the start of their enclosing block but cannot be read or written before the declaration line is reached at runtime. Accessing the binding in the TDZ produces a `ReferenceError` at runtime. The SJS type-checker performs static TDZ analysis within a single function body and emits SJS-E016 for definite TDZ violations.

### `const` with object and array values

Declaring `const obj: MyType = { ... }` means the variable `obj` cannot be rebound to a different object. It does not make the object's properties immutable. To express deep immutability, annotate the type with `readonly` properties (see `specs/language/006-interfaces.md`).

### Typed destructuring

Destructured bindings may carry per-element type annotations. These annotations constrain the expected element type rather than casting it:

```sjs
const { x: number, y: number } = point;
const [a: string, b: number]   = pair;
```

The right-hand side type must structurally satisfy the destructuring pattern. A mismatch between the annotation and the inferred element type is SJS-E001.

### Prefer-const lint rule (SJS-L001)

If a `let` binding is assigned exactly once (at its declaration or at a single unconditional assignment site) and never reassigned thereafter, the compiler emits SJS-L001 suggesting the author change the declaration to `const`.

---

## Type rules

```
Γ ⊢ e : S    S <: T
─────────────────────────────────────── (const-typed)
Γ ⊢ const x: T = e : Γ[x ↦ T]

Γ ⊢ e : T
─────────────────────────────────────── (const-inferred)
Γ ⊢ const x = e : Γ[x ↦ T]

─────────────────────────────────────── (let-uninit)
Γ ⊢ let x: T : Γ[x ↦ T]        -- x is uninitialized; reading before assignment → SJS-E016

Γ ⊢ e : S    S <: T
─────────────────────────────────────── (let-typed)
Γ ⊢ let x: T = e : Γ[x ↦ T]

Γ ⊢ e : T
─────────────────────────────────────── (let-inferred)
Γ ⊢ let x = e : Γ[x ↦ T]
```

For destructuring declarations the rule is applied per element:

```
Γ ⊢ e : { p: S }    S <: T
─────────────────────────────────────── (object-destructure-typed)
Γ ⊢ const { p: T } = e : Γ[p ↦ T]

Γ ⊢ e : [S, ...]    S <: T
─────────────────────────────────────── (array-destructure-typed)
Γ ⊢ const [p: T, ...] = e : Γ[p ↦ T]
```

Binding-level type annotations are assertions; if `S` is not a subtype of `T`, SJS-E001 is emitted. They are not casts and do not suppress the error.

---

## JS Lowering (Prototype)

Type annotations are erased. `const`, `let`, and `var` keywords pass through unchanged. Typed destructuring becomes standard JS destructuring with annotations dropped.

```sjs
// SJS input
const name: string = "Alice";
let   count: number = 0;
var   legacy: boolean = true;

const { x: number, y: number } = origin;
const [first: string, ...rest: string[]] = items;
```

```javascript
// JS output
const name = "Alice";
let   count = 0;
var   legacy = true;

const { x, y } = origin;
const [first, ...rest] = items;
```

No helpers are emitted. TDZ enforcement is left to the JS runtime.

---

## LLVM Lowering (Future)

```llvm
; const x: i64 = 42  →  SSA value (no alloca if not address-taken)
%x = add i64 0, 42

; let y: i64          →  alloca on entry block
%y = alloca i64
; ... later assignment:
store i64 %val, i64* %y

; var z: i64          →  alloca hoisted to function entry (same as let at IR level)
%z = alloca i64
```

`const` bindings that are never address-taken and never escape are represented as pure SSA values — no stack allocation is needed. `let` and `var` both produce `alloca` instructions in the function's entry block. The SJS compiler marks `const` SSA values with LLVM `readonly` metadata to assist alias analysis.

---

## Diagnostic codes

| Code     | When emitted |
|----------|-------------|
| `SJS-E001` | Type of initializer or destructured element is not assignable to the declared type |
| `SJS-E016` | `let` or `const` binding read before its first definite assignment (static TDZ violation) |
| `SJS-L001` | `let` binding is never reassigned — prefer `const` |
| `SJS-L002` | `var` declaration used — prefer `let` or `const` |

---

## Examples

### Valid

```sjs
// Typed const — annotation matches inferred type
const greeting: string = "hello";

// Typed let with later reassignment
let score: number = 0;
score = score + 10;

// Const inferred — no annotation needed
const PI = 3.14159;

// Object destructuring with typed bindings
type Point { x: number; y: number; }
const origin: Point = { x: 0, y: 0 };
const { x: number, y: number } = origin;

// Array destructuring with typed bindings and rest
const pair: [string, number] = ["age", 30];
const [label: string, value: number] = pair;

// Optional destructuring default
const { timeout: number = 5000 } = config;

// Nullable typed let (uninitialized is valid; type includes null)
let current: string? = null;
current = "active";
```

### Invalid

```sjs
// SJS-E001: null assigned to non-nullable const
const name: string = null;
//                   ^^^^ SJS-E001: null is not assignable to string

// SJS-E001: type mismatch in typed destructuring
const point = { x: 1, y: 2 };
const { x: string } = point;
//         ^^^^^^ SJS-E001: number is not assignable to string

// SJS-E016: let binding read before assignment
let result: number;
console.log(result);
//          ^^^^^^ SJS-E016: result may be uninitialized

// SJS-L001: let never reassigned — prefer const
let fixed: string = "immutable";
//  ^^^^^ SJS-L001: fixed is never reassigned; use const

// SJS-L002: var declaration
var counter: number = 0;
//  ^^^^^^^ SJS-L002: var is discouraged; use let or const

// SJS-E001: const binding reassigned
const limit = 100;
limit = 200;
// ^^^^^ SJS-E001: cannot reassign const binding limit
```


# 021 — Functions

**Status:** Stage 1 — implemented
**Grammar:** `specs/grammar.ebnf` §FunctionDecl, §ArrowFunction, §ParameterList, §Parameter, §RestParameter

---

## Syntax

```ebnf
<FunctionDecl>   ::= [ "async" ] "function" [ "*" ] <Identifier>
                     [ <TypeParameters> ]
                     "(" [ <ParameterList> ] ")"
                     [ ":" <Type> ]
                     <BlockStatement>

<ArrowFunction>  ::= [ "async" ]
                     ( <Identifier> | "(" [ <ParameterList> ] ")" )
                     [ ":" <Type> ] "=>" ( <Expression> | <BlockStatement> )

<ParameterList>  ::= <Parameter> { "," <Parameter> } [ "," <RestParameter> ]
                   | <RestParameter>

<Parameter>      ::= <BindingPattern> [ "?" ] [ ":" <Type> ] [ "=" <Expression> ]

<RestParameter>  ::= "..." <Identifier> [ ":" <Type> ]

<TypeParameters> ::= "<" <TypeParameter> { "," <TypeParameter> } ">"
<TypeParameter>  ::= <Identifier> [ "=" <Type> ]
```

---

## Semantics

### Function declarations

A function declaration introduces a named binding that is hoisted to the top of its enclosing scope. The binding is available throughout the scope, including above the declaration line. Function declarations are block-hoisted in strict mode; they are function-hoisted in sloppy mode, but SJS files are always in strict mode semantically.

### Function expressions and arrow functions

A function expression `function f(...) { ... }` is not hoisted; the binding is available only after the expression is evaluated. An arrow function `(...) => ...` is likewise not hoisted. Arrow functions additionally:

- Capture `this` lexically from the enclosing scope rather than binding their own `this`.
- Do not have their own `arguments` object.
- Cannot be used as constructors (`new` applied to an arrow function is a type error, SJS-E009).

### Optional parameters: `p?: T`

A parameter declared `p?: T` allows callers to omit the argument. Inside the function body, `p` has type `T | undefined`. Code that uses `p` as `T` must narrow it first (e.g., `if (p !== undefined) { ... }`). Optional parameters must appear after all required parameters.

### Default parameters: `p: T = expr`

A parameter with a default value allows callers to omit the argument or pass `undefined`. When the argument is omitted or `undefined`, `expr` is evaluated and used. Inside the function body, `p` has type `T` (the default eliminates the `undefined` case before the body executes). Default parameters may appear in any position, but a required parameter must not follow an optional parameter in the same list.

### Rest parameters: `...args: T[]`

A rest parameter collects all remaining arguments into an array. Its type must be an array type `T[]` or a tuple type. It must be the last parameter in the list. Inside the function body, `args` has type `T[]`.

### `this` parameter

The first parameter may be named `this` to annotate the expected receiver type. This parameter is a type-only annotation; it is erased in JS output and does not appear in the parameter count at call sites.

```sjs
function greet(this: User, prefix: string): string { ... }
```

### Function overloads

TypeScript-style function overload signatures are not supported in SJS. Use union types on parameters to model multiple call signatures:

```sjs
// Use union types instead of overloads
function process(input: string | number): string { ... }
```

### Generic functions

A function may declare type parameters with `<T, U, ...>`. Type arguments are inferred from call-site arguments; explicit type arguments are also accepted. See `specs/language/005-generics.md` for full generics semantics.

### `async` functions

An `async` function always returns `Promise<T>`, where `T` is the return type annotation. The return annotation should be `T` (not `Promise<T>`); the compiler wraps it automatically. A return annotation of `Promise<T>` is also accepted but redundant.

### Generator functions: `function*`

A generator function returns `Generator<Y, R, N>` where `Y` is the yield type, `R` is the return type, and `N` is the next-value type. The `yield` expression has type `N` (the value sent back via `.next(v)`). Async generators (`async function*`) return `AsyncGenerator<Y, R, N>`.

---

## Type rules

```
Γ, x₁:P₁, …, xₙ:Pₙ ⊢ body : R
────────────────────────────────────────────────── (fn-decl)
Γ ⊢ function f(x₁:P₁, …, xₙ:Pₙ): R { body } : (P₁, …, Pₙ) => R

Γ ⊢ f : (P₁, …, Pₙ) => R
Γ ⊢ a₁ : A₁, …, Γ ⊢ aₙ : Aₙ
∀i. Aᵢ <: Pᵢ
─────────────────────────────────────────────────── (fn-call)
Γ ⊢ f(a₁, …, aₙ) : R

Γ, p : T | undefined ⊢ body : R
─────────────────────────────────────────────────── (opt-param)
Γ ⊢ function f(p?: T): R { body } : (p?: T) => R

Γ, p : T ⊢ body : R
─────────────────────────────────────────────────── (default-param)
Γ ⊢ function f(p: T = e): R { body } : (p?: T) => R
-- caller may omit p; inside body p : T (default applied)

Γ, args : T[] ⊢ body : R
─────────────────────────────────────────────────── (rest-param)
Γ ⊢ function f(...args: T[]): R { body } : (...T[]) => R

Γ, x₁:P₁, …, xₙ:Pₙ ⊢ body : R
─────────────────────────────────────────────────── (arrow-fn)
Γ ⊢ (x₁:P₁, …, xₙ:Pₙ): R => body : (P₁, …, Pₙ) => R

Γ ⊢ function f<T>(x: T): T { body } : <T>(T) => T
── instantiate at call: T := A ─────────────────── (generic-fn)
Γ ⊢ f(a) : A      where Γ ⊢ a : A

Γ, params ⊢ body : T
─────────────────────────────────────────────────── (async-fn)
Γ ⊢ async function f(params): T { body } : Promise<T>

Γ, params ⊢ body yields Y, returns R
─────────────────────────────────────────────────── (generator-fn)
Γ ⊢ function* f(params): Generator<Y, R, N> { body }
```

---

## JS Lowering (Prototype)

Type annotations and `this` parameters are erased. `async` functions, generators, arrow functions, default parameters, and rest parameters all pass through to native JS syntax.

```sjs
// SJS input
function add(x: number, y: number): number {
  return x + y;
}

async function fetchUser(id: string): User {
  const data = await getJson(`/users/${id}`);
  return data as User;
}

function* range(start: number, end: number): Generator<number, void, undefined> {
  for (let i: number = start; i < end; i++) {
    yield i;
  }
}

const double = (n: number): number => n * 2;

function greet(name: string = "world"): string {
  return `Hello, ${name}!`;
}

function sum(...nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0);
}
```

```javascript
// JS output
function add(x, y) {
  return x + y;
}

async function fetchUser(id) {
  const data = await getJson(`/users/${id}`);
  return data;
}

function* range(start, end) {
  for (let i = start; i < end; i++) {
    yield i;
  }
}

const double = (n) => n * 2;

function greet(name = "world") {
  return `Hello, ${name}!`;
}

function sum(...nums) {
  return nums.reduce((a, b) => a + b, 0);
}
```

The `this` parameter is erased entirely:

```sjs
// SJS input
function toString(this: Date): string {
  return this.toISOString();
}
```

```javascript
// JS output
function toString() {
  return this.toISOString();
}
```

---

## LLVM Lowering (Future)

```llvm
; function add(x: i64, y: i64): i64
define i64 @add(i64 %x, i64 %y) {
entry:
  %result = add i64 %x, %y
  ret i64 %result
}

; Default parameter: function greet(name: *Str = "world"): *Str
define %Str* @greet(%Str* %name_or_undef) {
entry:
  %is_undef = icmp eq %Str* %name_or_undef, @SJS_UNDEFINED
  %name = select i1 %is_undef, %Str* @str_world, %Str* %name_or_undef
  ; ... build greeting string
}

; Rest parameter: function sum(...nums: i64[]): i64
; Compiled to a varargs struct passed as { i64 length, i64* data }
define i64 @sum(%Array_i64* %nums) {
  ; iterate nums->data[0..nums->length]
}

; Closure / arrow function: const double = (n: i64): i64 => n * 2
; Represented as fat pointer { fnptr, envptr }
%Closure_double = type { i64 (i64, i8*)*, i8* }
```

Async functions are lowered to a coroutine using LLVM's `@llvm.coro.*` intrinsics. Generator functions are similarly lowered as stackful or stackless coroutines depending on the compiler backend configuration.

---

## Diagnostic codes

| Code       | When emitted |
|------------|-------------|
| `SJS-E002` | Return expression type does not match the declared return type |
| `SJS-E003` | Argument type is not assignable to the corresponding parameter type |
| `SJS-E009` | `new` applied to an arrow function or non-constructor callable |
| `SJS-W001` | Parameter has no type annotation in `--strict` mode |

---

## Examples

### Valid

```sjs
// Fully typed function declaration
function multiply(a: number, b: number): number {
  return a * b;
}

// Generic function with inferred type argument
function identity<T>(value: T): T {
  return value;
}
const s: string = identity("hello");

// Arrow function with explicit return type
const square = (n: number): number => n * n;

// Optional parameter — body must guard before use
function greet(name?: string): string {
  if (name !== undefined) {
    return `Hello, ${name}`;
  }
  return "Hello";
}

// Default parameter — type is T inside body
function withTimeout(ms: number = 3000): void {
  setTimeout(() => {}, ms);
}

// Rest parameter
function joinStrings(sep: string, ...parts: string[]): string {
  return parts.join(sep);
}

// async function — return annotation is T, not Promise<T>
async function loadConfig(path: string): Config {
  const text = await readFile(path);
  return parseConfig(text);
}

// Generator
function* integers(from: number): Generator<number, void, undefined> {
  let n: number = from;
  while (true) {
    yield n++;
  }
}

// this parameter annotation
function format(this: NumberFormatter, value: number): string {
  return this.prefix + value.toFixed(this.decimals);
}
```

### Invalid

```sjs
// SJS-E002: return type mismatch
function getAge(): number {
  return "thirty";
  //     ^^^^^^^^ SJS-E002: string is not assignable to number
}

// SJS-E003: argument type mismatch
function double(n: number): number { return n * 2; }
double("10");
//     ^^^^ SJS-E003: string is not assignable to number

// SJS-E009: new applied to arrow function
const Ctor = (x: number) => x;
const obj = new Ctor(1);
//          ^^^ SJS-E009: arrow functions cannot be used as constructors

// SJS-W001: unannotated parameter in strict mode
function process(value): string {
  //             ^^^^^ SJS-W001: parameter value has no type annotation
  return String(value);
}

// Overload syntax (not supported — use union types instead)
function parse(input: string): number;           // SJS syntax error
function parse(input: number): number;           // SJS syntax error
function parse(input: string | number): number { return Number(input); }
```


# 022 — Classes

**Status:** Stage 1 — implemented
**Grammar:** `specs/grammar.ebnf` §ClassDecl, §ClassMember, §ClassProperty, §ClassMethod, §ClassConstructor, §AccessModifier

---

## Syntax

```ebnf
<ClassDecl>        ::= [ "abstract" ] "class" <Identifier>
                       [ <TypeParameters> ]
                       [ "extends" <TypeRef> [ <TypeArguments> ] ]
                       "{" { <ClassMember> } "}"

<ClassMember>      ::= <ClassProperty>
                     | <ClassMethod>
                     | <ClassConstructor>
                     | <ClassStaticBlock>

<ClassProperty>    ::= [ <AccessModifier> ] [ "static" ] [ "readonly" ] [ "abstract" ]
                       <Identifier> [ "?" ] [ ":" <Type> ] [ "=" <Expression> ] ";"
                     | "#" <Identifier> [ ":" <Type> ] [ "=" <Expression> ] ";"

<ClassConstructor> ::= [ <AccessModifier> ]
                       "constructor"
                       "(" [ <ParameterList> ] ")"
                       <BlockStatement>

<ClassMethod>      ::= [ <AccessModifier> ] [ "static" ] [ "abstract" ] [ "async" ]
                       [ "get" | "set" | "*" ]
                       <Identifier>
                       [ <TypeParameters> ]
                       "(" [ <ParameterList> ] ")"
                       [ ":" <Type> ]
                       ( <BlockStatement> | ";" )

<ClassStaticBlock> ::= "static" <BlockStatement>

<AccessModifier>   ::= "public" | "private" | "protected"
```

---

## Semantics

### Nominal vs structural typing

A class in SJS introduces both a value (the constructor function) and a type (the instance shape). Class types are nominal for `instanceof` checks and subtype hierarchy tracking. They are structural for object-type conformance: an instance of class `C` is assignable to an object type `I` (a `type` brace-form declaration) if `C` has all members required by `I` with compatible types, regardless of whether any explicit `implements` clause exists. SJS has no `implements` clause; conformance is purely structural. See `specs/language/006-interfaces.md`.

### Single inheritance

A class may extend at most one base class with `extends`. Multiple inheritance is not supported. The subclass constructor must call `super(...)` before any access to `this`; accessing `this` before `super()` in a derived constructor is SJS-E016 (TDZ-like restriction imposed by the ES2015 specification).

### Abstract classes

An `abstract` class cannot be instantiated directly. Calling `new` on an abstract class is SJS-E016. An abstract class may contain:

- Concrete members with implementations (shared by all subclasses).
- Abstract members with no body (declared with a trailing `;`). Subclasses must implement every inherited abstract member unless they are also declared `abstract`.

Failing to implement an inherited abstract method in a non-abstract subclass is SJS-E015.

### Access modifiers: `public`, `private`, `protected`

Access modifiers are enforced at the type-checker level only; they produce no runtime difference in JS output. The three modifiers are:

- `public` — accessible everywhere (default if omitted).
- `private` — accessible only within the class body. Attempting to access a `private` member from outside the class is SJS-E014.
- `protected` — accessible within the class body and within subclass bodies. Accessing a `protected` member from a non-subclass context is SJS-E014.

`private` modifier access restriction is distinct from ECMAScript hard-private `#field` syntax (see below).

### Hard-private fields: `#field`

A field prefixed with `#` uses ECMAScript 2022 private field syntax. Hard-private fields are runtime-enforced: they cannot be accessed outside the class even through dynamic property access or reflection. Hard-private fields are not inherited and do not appear in `Object.keys()`, `JSON.stringify()`, or any enumeration mechanism. The type of a hard-private field is visible to the type-checker only within the class body.

Hard-private `#field` and `private` modifier are orthogonal:
- `private x: T` — type-level privacy only; `x` appears as a regular property in JS.
- `#x: T` — runtime privacy; `#x` is a hard-private slot.

### `static` members

A `static` member belongs to the class constructor object rather than to any instance. Static members are accessed via the class name: `ClassName.member`. `static readonly` declares a class constant. Static members are not inherited through `extends` at the type level (the static type of the subclass constructor does include inherited static members via the prototype chain, but SJS treats them as accessible on both the base and derived class).

### Accessors: `get` / `set`

A `get` accessor declares a getter; its type is `(): T`. A `set` accessor declares a setter; its type is `(v: T): void`. The getter and setter for the same property name must agree on `T`.

### Constructor parameter property shorthand

A constructor parameter may carry an access modifier (`public`, `private`, or `protected`). This shorthand simultaneously declares the corresponding instance property and assigns `this.param = param` in the constructor body. The declared type of the property is taken from the parameter annotation.

```sjs
class Point {
  constructor(public x: number, public y: number) {}
  // equivalent to:
  //   public x: number; public y: number;
  //   constructor(x: number, y: number) { this.x = x; this.y = y; }
}
```

### Class static block

A `static { ... }` block runs exactly once when the class declaration is evaluated. It can access `static` members and is used for one-time initialization. Multiple static blocks in a single class execute in textual order.

### Class expressions

A class expression `const C = class { ... }` is an anonymous or named class value. The semantics are identical to a class declaration, except the binding is not hoisted and the class name (if present) is scoped to the class body only.

---

## Type rules

```
C has declared member m: T, accessibility A
access site is permitted under A
──────────────────────────────────────────── (class-member-access)
Γ ⊢ expr.m : T      where Γ ⊢ expr : C

class D extends C  (D is a subtype of C)
──────────────────────────────────────────── (class-extends-sub)
Γ ⊢ new D() : D     and     D <: C

abstract class C
──────────────────────────────────────────── (abstract-no-new)
Γ ⊢ new C(...)  →  SJS-E016

abstract class C { abstract m(): T }
class D extends C { m(): T { ... } }
──────────────────────────────────────────── (abstract-impl)
D satisfies abstract member m

class D extends C  without implementing abstract m
──────────────────────────────────────────── (abstract-missing)
D  →  SJS-E015 for each unimplemented abstract member

access to private/protected member from disallowed site
──────────────────────────────────────────── (access-violation)
Γ ⊢ expr.m  →  SJS-E014
```

---

## JS Lowering (Prototype)

Class syntax passes through as ES2015+ class syntax. Type annotations, `abstract` modifier, and access modifiers (`public`, `private`, `protected`) are erased. Hard-private `#field` syntax passes through natively. Constructor parameter property shorthand is desugared into explicit property declarations and constructor assignments.

```sjs
// SJS input
abstract class Shape {
  protected abstract area(): number;
  describe(): string {
    return `Area is ${this.area()}`;
  }
}

class Circle extends Shape {
  #radius: number;
  constructor(public readonly label: string, r: number) {
    super();
    this.#radius = r;
  }
  protected area(): number {
    return Math.PI * this.#radius ** 2;
  }
}
```

```javascript
// JS output
class Shape {
  describe() {
    return `Area is ${this.area()}`;
  }
}

class Circle extends Shape {
  #radius;
  label;
  constructor(label, r) {
    super();
    this.label = label;
    this.#radius = r;
  }
  area() {
    return Math.PI * this.#radius ** 2;
  }
}
```

---

## LLVM Lowering (Future)

```llvm
; class layout: { vtable_ptr, fields... }
%Circle = type { %Circle_vtable*, %Str*, double }
;                               ^label  ^#radius

; vtable for Circle
%Circle_vtable = type { double (%Circle*)* }    ; slot 0: area
@Circle_vtable_instance = global %Circle_vtable {
  double (%Circle*)* @Circle_area
}

; constructor: Circle(label, r)
define %Circle* @Circle_new(%Str* %label, double %r) {
entry:
  %self = call i8* @sjs_alloc(i64 ptrtoint (%Circle* getelementptr (%Circle, %Circle* null, i32 1) to i64))
  %typed = bitcast i8* %self to %Circle*
  %vt_ptr = getelementptr %Circle, %Circle* %typed, i32 0, i32 0
  store %Circle_vtable* @Circle_vtable_instance, %Circle_vtable** %vt_ptr
  ; store label and #radius fields
  ret %Circle* %typed
}

; abstract class: vtable slots for unimplemented abstract methods hold a trap stub
define double @SJS_abstract_trap() {
  call void @llvm.trap()
  unreachable
}
```

Static fields compile to global variables. `readonly static` fields are LLVM `constant` globals. Hard-private `#field` becomes a private struct field with no external linkage symbol.

---

## Diagnostic codes

| Code       | When emitted |
|------------|-------------|
| `SJS-E014` | Access to a `private` or `protected` member from a disallowed site |
| `SJS-E015` | Non-abstract subclass does not implement an inherited abstract method |
| `SJS-E016` | `new` applied to an abstract class; or `this` accessed before `super()` in a derived constructor |

---

## Examples

### Valid

```sjs
// Concrete class with typed properties
class Vector {
  public x: number;
  public y: number;
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
  magnitude(): number {
    return Math.sqrt(this.x ** 2 + this.y ** 2);
  }
}

// Constructor parameter shorthand
class Point {
  constructor(public x: number, public y: number) {}
}

// Abstract base class
abstract class Animal {
  protected abstract speak(): string;
  greet(): string {
    return `I say: ${this.speak()}`;
  }
}

class Dog extends Animal {
  protected speak(): string { return "Woof"; }
}
const d = new Dog();
console.log(d.greet()); // "I say: Woof"

// Hard-private field
class Counter {
  #count: number = 0;
  increment(): void { this.#count++; }
  get value(): number { return this.#count; }
}

// Generic class
class Box<T> {
  private contents: T;
  constructor(value: T) { this.contents = value; }
  get(): T { return this.contents; }
}
const b = new Box<number>(42);

// Static member and readonly
class Config {
  static readonly DEFAULT_TIMEOUT: number = 5000;
  static create(): Config { return new Config(); }
}

// get/set accessors
class Temperature {
  private _celsius: number = 0;
  get celsius(): number { return this._celsius; }
  set celsius(v: number) { this._celsius = v; }
  get fahrenheit(): number { return this._celsius * 9 / 5 + 32; }
}
```

### Invalid

```sjs
// SJS-E016: new on abstract class
abstract class Base { abstract init(): void; }
const b = new Base();
//        ^^^^^^^^^ SJS-E016: cannot instantiate abstract class Base

// SJS-E015: abstract method not implemented
abstract class Logger {
  abstract log(msg: string): void;
}
class SilentLogger extends Logger {
  // SJS-E015: log() not implemented in non-abstract subclass SilentLogger
}

// SJS-E014: private member accessed outside class
class Wallet {
  private balance: number = 0;
}
const w = new Wallet();
console.log(w.balance);
//            ^^^^^^^ SJS-E014: balance is private to Wallet

// SJS-E016: this accessed before super()
class Derived extends Vector {
  constructor() {
    this.x = 1;    // SJS-E016: must call super() before this
    super(0, 0);
  }
}

// SJS-E014: protected member accessed from outside hierarchy
class Animal { protected name: string = ""; }
const a = new Animal();
console.log(a.name);
//            ^^^^ SJS-E014: name is protected on Animal
```


# 023 — Modules
**Status:** Stage 1 — planned
**Grammar:** `specs/grammar.ebnf` §Import / Export Declarations

## Syntax

(EBNF from grammar — ImportDecl, ExportDecl, ImportClause, NamedImports, etc.)

## Semantics

ES modules only — `namespace` banned (SJS-E012). Static import/export. Type-only imports/exports erased at compile. Dynamic `import()` returns `Promise<ModuleType>`. `import.meta` contextual object. Circular imports detected at compile → SJS-E017. Module resolution: relative paths (`./`, `../`) from current file; bare specifiers via node_modules or `paths` in superjs.config.json; `.sjs` extension optional (compiler adds if absent). `declare module` for ambient untyped libs.

Import forms:
- Named: `import { a, b as c } from "./mod"`
- Default: `import Foo from "./foo"`
- Namespace: `import * as Mod from "./mod"` — Mod is module namespace object
- Side-effect: `import "./setup"` — no bindings
- Type-only: `import type { T } from "./types"` — erased entirely

Export forms:
- Named: `export { x, y as z }`
- Default: `export default expr` / `export default function f()` / `export default class C`
- Re-export: `export { x } from "./mod"` — re-exports without binding in current scope
- Wildcard re-export: `export * from "./mod"`
- Type-only: `export type { T }`
- Inline: `export const x = ...` / `export function f()` / `export class C`

Dynamic import: `import("./mod")` → `Promise<{ default: T, namedExport: U, ... }>`. Lazy loading for code splitting.

`import.meta`: available in ES modules. Browser: `{ url: string }`. Node.js: `{ url: string, dirname: string, filename: string }`. SJS type: `ImportMeta` (defined in platform-specific .d.sjs).

`declare module` for ambient declarations:
```sjs
declare module "untyped-lib" {
  export function doThing(x: string): number
}
```

## Type rules

Module namespace object type: `import * as Mod from "./mod"` — Mod has type `{ [exportName]: exportType }` — each named export becomes a property. Type of `import()` = `Promise<ModuleNamespace>`.

## JS Lowering (Prototype)

ES module syntax passes through as-is (for ES2015+ targets). `import type` / `export type` → erased (zero output). `declare module` → erased. For CommonJS target (`--module=cjs`): `import x from "m"` → `const x = require("m")`, `export default x` → `module.exports = x`, named exports → `exports.name = value`.

## LLVM Lowering (Future)

Each `.sjs` file = one LLVM module. `export` = external linkage symbol (`define` with default visibility). `import` = `declare` (extern linkage). Link time: LLVM linker resolves cross-module references. Dynamic import = runtime `dlopen`/`dlsym` or bundler-provided chunk loading (TBD).

## Diagnostic codes

| Code | When emitted |
|------|-------------|
| SJS-E012 | `namespace` keyword used |
| SJS-E017 | Circular import cycle detected |
| SJS-W003 | Imported binding never used |

## Examples

### Valid

```sjs
// Named imports and exports
import { add, multiply } from "./math"
import type { Vector2 } from "./types"

export function double(n: number): number { return n * 2 }
export type { Vector2 }

// Default export/import
import React from "react"
export default class App { }

// Namespace import
import * as Utils from "./utils"
const result: string = Utils.format("hello")

// Re-export
export { add } from "./math"
export * from "./helpers"

// Dynamic import
async function loadModule(): Promise<void> {
  const { default: Chart } = await import("./chart")
  Chart.render()
}

// import.meta
console.log(import.meta.url)
```

### Invalid

```sjs
// ✗ SJS-E012: namespace not allowed
namespace Utils {
  export function format(s: string): string { return s.trim() }
}

// ✗ SJS-E017: circular import (if mod-a imports mod-b and mod-b imports mod-a)
import { x } from "./mod-b"   // when mod-b also imports from this file
```


# 030 — Operators

**Status:** Stage 1 — implemented
**Grammar:** `specs/grammar.ebnf` §UnaryExpression, §UpdateExpression, §ExponentiationExpression, §BitwiseOrExpression, §BitwiseXorExpression, §BitwiseAndExpression, §EqualityExpression, §LogicalAndExpression, §LogicalOrExpression

---

## Syntax

```ebnf
<UnaryExpression>    ::= <UpdateExpression>
                       | "typeof" <UnaryExpression>
                       | "void"   <UnaryExpression>
                       | "delete" <UnaryExpression>
                       | "!"      <UnaryExpression>
                       | "~"      <UnaryExpression>
                       | "+"      <UnaryExpression>
                       | "-"      <UnaryExpression>

<UpdateExpression>   ::= <LeftHandSideExpression>
                       | <LeftHandSideExpression> "++"
                       | <LeftHandSideExpression> "--"
                       | "++" <UnaryExpression>
                       | "--" <UnaryExpression>

<ExponentiationExpression> ::= <UnaryExpression>
                             | <UpdateExpression> "**" <ExponentiationExpression>

<MultiplicativeExpression> ::= <ExponentiationExpression>
                             | <MultiplicativeExpression> "*" <ExponentiationExpression>
                             | <MultiplicativeExpression> "/" <ExponentiationExpression>
                             | <MultiplicativeExpression> "%" <ExponentiationExpression>

<AdditiveExpression> ::= <MultiplicativeExpression>
                       | <AdditiveExpression> "+" <MultiplicativeExpression>
                       | <AdditiveExpression> "-" <MultiplicativeExpression>

<ShiftExpression>    ::= <AdditiveExpression>
                       | <ShiftExpression> "<<"  <AdditiveExpression>
                       | <ShiftExpression> ">>"  <AdditiveExpression>
                       | <ShiftExpression> ">>>" <AdditiveExpression>

<RelationalExpression> ::= <ShiftExpression>
                         | <RelationalExpression> "<"          <ShiftExpression>
                         | <RelationalExpression> ">"          <ShiftExpression>
                         | <RelationalExpression> "<="         <ShiftExpression>
                         | <RelationalExpression> ">="         <ShiftExpression>
                         | <RelationalExpression> "instanceof" <ShiftExpression>
                         | <RelationalExpression> "in"         <ShiftExpression>

<EqualityExpression> ::= <RelationalExpression>
                       | <EqualityExpression> "===" <RelationalExpression>
                       | <EqualityExpression> "!==" <RelationalExpression>
```

Operators `==` and `!=` are syntactically accepted by the parser but immediately flagged as SJS-L003. The non-null postfix `!` (TypeScript assertion) is banned and emits SJS-E011.

---

## Semantics

### Arithmetic operators (`+`, `-`, `*`, `/`, `%`, `**`)

Binary arithmetic requires operands of the same numeric type or, for `+`, admits `string`. Mixed `bigint`/`number` in any arithmetic expression is a type error.

`/` between two `number` operands always produces `number` (IEEE 754 double); integer truncation is not implied. `%` is the remainder operator, consistent with ECMA-262.

### Unary operators

- `+expr` / `-expr` — numeric coercion / negation; operand must be `number` or `bigint`.
- `!expr` — logical negation; any type is accepted; result is always `boolean`.
- `~expr` — bitwise NOT; operand must be `number` (integer-valued) or `bigint`.
- `typeof expr` — returns a string literal union (see Type rules).
- `void expr` — evaluates `expr` for side effects; result is `undefined`.
- `delete expr` — removes a property; operand must be a property access; result is `boolean`.

### Update operators (`++`, `--`)

Pre- and post-increment/decrement. The operand must be a mutable `number` binding or property. Applying `++`/`--` to a `bigint` or `string` is SJS-E002. Applying to a `const` binding is SJS-E001.

### Bitwise operators (`&`, `|`, `^`, `~`, `<<`, `>>`, `>>>`)

Operands must both be `number` (integer-valued). `bigint` bitwise operations are permitted when both operands are `bigint`. Mixed types emit SJS-E002.

### Comparison operators

`===` and `!==` are the only equality operators in SJS. `<`, `>`, `<=`, `>=` apply to `number`, `bigint`, and `string` operands of matching type. `instanceof` checks prototype chain at runtime; result is `boolean`. `in` checks property existence on an object; right operand must be `object`.

---

## Type rules

```
Γ ⊢ a : number    Γ ⊢ b : number
────────────────────────────────── (arith-number)
Γ ⊢ a ⊕ b : number      where ⊕ ∈ {+,-,*,/,%,**}

Γ ⊢ a : bigint    Γ ⊢ b : bigint
────────────────────────────────── (arith-bigint)
Γ ⊢ a ⊕ b : bigint       where ⊕ ∈ {+,-,*,/,%,**}

Γ ⊢ a : string    Γ ⊢ b : string
────────────────────────────────── (str-concat)
Γ ⊢ a + b : string

Γ ⊢ a : number    Γ ⊢ b : string
────────────────────────────────── (num-str-concat)
Γ ⊢ a + b : string

Γ ⊢ a : bigint    Γ ⊢ b : number
────────────────────────────────── (bigint-number-error)
Γ ⊢ a + b : ⊥    →  SJS-E005

Γ ⊢ e : T
────────────────────────────────── (logical-not)
Γ ⊢ !e : boolean

Γ ⊢ e : T
────────────────────────────────── (typeof)
Γ ⊢ typeof e : "number"|"string"|"boolean"|"bigint"|"symbol"|"function"|"object"|"undefined"

Γ ⊢ e : number
────────────────────────────────── (update)
Γ ⊢ e++ : number    Γ ⊢ ++e : number
```

---

## JS Lowering (Prototype)

All operators lower directly to their JavaScript equivalents — no transformation is needed. Type annotations are erased; the operators themselves are native JS.

```sjs
// SJS input
const a: number = 10;
const b: number = 3;
const sum: number   = a + b;
const prod: number  = a * b;
const bits: number  = a & b;
const kind: string  = typeof a;
let   n: number     = 0;
n++;
```

```javascript
// JS output
const a = 10;
const b = 3;
const sum   = a + b;
const prod  = a * b;
const bits  = a & b;
const kind  = typeof a;
let   n     = 0;
n++;
```

---

## LLVM Lowering (Future)

```llvm
; number (f64) arithmetic
%sum  = fadd double %a, %b
%diff = fsub double %a, %b
%prod = fmul double %a, %b
%quot = fdiv double %a, %b
%rem  = frem double %a, %b

; bigint arithmetic — maps to arbitrary-precision runtime calls
%r = call %BigInt* @__sjs_bigint_add(%BigInt* %a, %BigInt* %b)

; integer bitwise (after ToInt32 conversion for number)
%ia = fptosi double %a to i32
%ib = fptosi double %b to i32
%and = and i32 %ia, %ib
%shl = shl i32 %ia, %ib

; comparison (number → fcmp, integer → icmp)
%lt = fcmp olt double %a, %b
%eq = fcmp oeq double %a, %b

; update (++n)
%n1 = fadd double %n, 1.0
store double %n1, double* %n_ptr
```

---

## Diagnostic codes

| Code | When emitted |
|------|-------------|
| `SJS-E001` | `++`/`--` applied to `const` binding |
| `SJS-E002` | `++`/`--` applied to non-`number` operand; mismatched types in bitwise ops |
| `SJS-E005` | `bigint` and `number` mixed in arithmetic expression |
| `SJS-E011` | Postfix `!` non-null assertion used |
| `SJS-L003` | `==` or `!=` used instead of `===` / `!==` |

---

## Examples

### Valid

```sjs
// Arithmetic — matching types
const x: number = 4 ** 2;
const y: number = x % 3;
const s: string = "hello" + " " + "world";
const n: number = +"42";

// Bitwise
const flags: number = 0b1010 & 0b1100;
const shifted: number = flags << 2;

// typeof guard
function process(val: dynamic): string {
  if (typeof val === "string") {
    return val.toUpperCase();
  }
  return String(val);
}

// Update
let count: number = 0;
count++;
++count;

// Comparison
const eq: boolean = count === 2;
const ne: boolean = count !== 0;
```

### Invalid

```sjs
// SJS-E005: bigint + number
const n: bigint = 1n;
const m: number = 2;
const bad = n + m;
//          ^^^^^ SJS-E005: cannot mix bigint and number in arithmetic

// SJS-L003: == used instead of ===
if (count == 0) { }
//         ^^ SJS-L003: use === instead of ==

// SJS-E011: non-null assertion
const name: string? = null;
const upper = name!.toUpperCase();
//        ^ SJS-E011: ! operator is not permitted; use null narrowing

// SJS-E002: ++ on string
let label: string = "a";
label++;
// ^^^^ SJS-E002: ++ operand must be number, got string
```


# 031 — Optional Chaining

**Status:** Stage 1 — implemented
**Grammar:** `specs/grammar.ebnf` §LeftHandSideExpression, §MemberExpression, §CallExpression

---

## Syntax

```ebnf
<OptionalExpression> ::= <MemberExpression> <OptionalChain>
                       | <CallExpression>   <OptionalChain>
                       | <OptionalExpression> <OptionalChain>

<OptionalChain>      ::= "?." <Identifier>
                       | "?." "[" <Expression> "]"
                       | "?." "(" <ArgumentList> ")"
                       | <OptionalChain> "." <Identifier>
                       | <OptionalChain> "[" <Expression> "]"
                       | <OptionalChain> "(" <ArgumentList> ")"
```

Three forms: property access `a?.b`, indexed access `a?.[key]`, and call `f?.()`.

---

## Semantics

The `?.` operator short-circuits to `undefined` when the left-hand side (LHS) is `null` or `undefined`. If the LHS is any other value, evaluation proceeds identically to the non-optional form.

Short-circuit is complete: when any `?.` in a chain fires, the entire tail of the chain is skipped and the overall expression evaluates to `undefined`. No subsequent property accesses, index operations, or calls in that chain are executed.

### `a?.b` — optional property access

Evaluates `a`. If `a` is `null` or `undefined`, the expression is `undefined`. Otherwise evaluates and returns `a.b`.

### `a?.[key]` — optional index access

Evaluates `a`, then `key`. If `a` is `null` or `undefined`, the expression is `undefined`. Otherwise evaluates and returns `a[key]`.

### `f?.()` — optional call

Evaluates `f`. If `f` is `null` or `undefined`, the expression is `undefined`. Otherwise calls `f()`. If `f` is not callable (not a function), a runtime `TypeError` is thrown — `?.()` only guards against null/undefined, not against non-functions.

### Chained `?.`

Each `?.` in a chain is an independent short-circuit guard. In `a?.b?.c`, if `a` is null the entire expression short-circuits to `undefined` without evaluating `b` or `c`. If `a` is non-null but `a.b` is null, the second `?.` short-circuits and `c` is not accessed.

### Combination with `??`

`a?.b ?? fallback` is the canonical pattern for providing a default when either `a` is null/undefined or `a.b` is null/undefined. The `??` operator fires on `undefined` (the short-circuit value from `?.`).

---

## Type rules

```
Γ ⊢ a : T?       PropType(T, 'p') = U
─────────────────────────────────────── (opt-prop-nullable)
Γ ⊢ a?.p : U | undefined

Γ ⊢ a : T        PropType(T, 'p') = U
─────────────────────────────────────── (opt-prop-nonnull)
Γ ⊢ a?.p : U

Γ ⊢ a : T?       IndexType(T, K) = U
─────────────────────────────────────── (opt-index-nullable)
Γ ⊢ a?.[k] : U | undefined

Γ ⊢ f : ((A) => R)?
─────────────────────────────────────── (opt-call-nullable)
Γ ⊢ f?.() : R | undefined

Γ ⊢ f : (A) => R
─────────────────────────────────────── (opt-call-nonnull)
Γ ⊢ f?.() : R
```

When the LHS is non-nullable, `?.` is still syntactically valid but the `| undefined` branch is unreachable. The type-checker may emit SJS-W005 for dead-code optional chains on provably non-null values.

---

## JS Lowering (Prototype)

For ES2020+ targets, `?.` passes through as-is (native support). For older targets, each `?.` is lowered to a conditional expression.

```sjs
// SJS input
const city = user?.address?.city;
const val  = arr?.[0];
const r    = cb?.();
```

```javascript
// JS output (ES2020+ target — pass-through)
const city = user?.address?.city;
const val  = arr?.[0];
const r    = cb?.();

// JS output (ES5 target — polyfill)
const city = (user === null || user === undefined)
  ? undefined
  : (user.address === null || user.address === undefined)
      ? undefined
      : user.address.city;

const val = (arr === null || arr === undefined)
  ? undefined
  : arr[0];

const r = (cb === null || cb === undefined)
  ? undefined
  : cb();
```

---

## LLVM Lowering (Future)

Each `?.` compiles to a null-tag check followed by a conditional branch. The result is unified via a phi node.

```llvm
; a?.b  where a: Nullable<T>
%has_a = extractvalue %Nullable_T %a, 0
br i1 %has_a, label %non_null, label %was_null

non_null:
  %inner = extractvalue %Nullable_T %a, 1
  %b_val = getelementptr %T, %T* %inner, i32 0, i32 <field_idx>
  %b = load <B_ty>, <B_ty>* %b_val
  br label %merge

was_null:
  ; undefined sentinel represented as zero-value or tagged union
  br label %merge

merge:
  %result = phi <B_ty | undef> [ %b, %non_null ], [ undef, %was_null ]
```

---

## Diagnostic codes

| Code | When emitted |
|------|-------------|
| `SJS-E003` | Plain `.` used on a nullable (`T?`) type without prior null narrowing; use `?.` |

---

## Examples

### Valid

```sjs
type Address { city: string; zip: string; }
type User    { name: string; address?: Address; }

// Optional property access
function getCity(u: User): string | undefined {
  return u.address?.city;
}

// Chained optional access
type Config { db?: { host?: string; } }
function getHost(cfg: Config): string | undefined {
  return cfg.db?.host;
}

// Optional call
function run(cb: (() => void)?): void {
  cb?.();
}

// Optional index access
function first(arr: string[]?): string | undefined {
  return arr?.[0];
}

// Combined with nullish coalescing
function cityOrDefault(u: User): string {
  return u.address?.city ?? "Unknown";
}
```

### Invalid

```sjs
// SJS-E003: plain . on nullable type
type Node { value: number; next?: Node; }

function bad(n: Node?): number {
  return n.value;
  //     ^^^^^^^ SJS-E003: n is Node? — use n?.value or narrow first
}

// SJS-E003: chained plain . on optional property
function alsoBad(u: User): string {
  return u.address.city;
  //     ^^^^^^^^^ SJS-E003: u.address is Address | undefined — use u.address?.city
}
```


# 032 — Nullish Coalescing

**Status:** Stage 1 — implemented
**Grammar:** `specs/grammar.ebnf` §NullishCoalescing, §AssignmentOperator

---

## Syntax

```ebnf
<NullishCoalescing> ::= <LogicalOrExpression>
                      | <NullishCoalescing> "??" <LogicalOrExpression>

<AssignmentExpression> ::= <ConditionalExpression>
                         | <LeftHandSideExpression> "??=" <AssignmentExpression>
```

Two operators: the binary `??` (nullish coalescing) and the compound assignment `??=` (nullish assignment).

---

## Semantics

### `a ?? b` — nullish coalescing

Returns `b` if and only if `a` is `null` or `undefined`. If `a` is any other value — including `0`, `""`, `false`, or `NaN` — `a` is returned unchanged.

This is the key distinction from the logical OR (`||`) operator: `||` treats all falsy values as trigger conditions, while `??` triggers only on the two nullish values (`null` and `undefined`).

```
0    ?? "default"   →  0          (0 is not nullish)
""   ?? "default"   →  ""         ("" is not nullish)
false ?? true       →  false      (false is not nullish)
null ?? "default"   →  "default"  (null is nullish)
undefined ?? "x"    →  "x"        (undefined is nullish)
```

### `a ??= b` — nullish assignment

Assigns `b` to `a` only if `a` is currently `null` or `undefined`. If `a` is non-null, no assignment occurs and `a` is not re-evaluated as an assignment target. This is short-circuit evaluation: `b` is evaluated only when the assignment will occur.

After `??=` executes (and assuming `b: B`), the type of `a` is narrowed to `T | B` where `T` is the non-nullable portion of its original declared type.

### Mixing `??` with `||` and `&&`

`??` cannot be directly chained with `||` or `&&` without explicit grouping parentheses. This is a syntax-level restriction (mirrors the ECMA-262 grammar) that prevents ambiguous precedence. Use parentheses to combine:

```sjs
(a || b) ?? c   // valid — explicit grouping
a ?? (b || c)   // valid — explicit grouping
a ?? b || c     // SJS-P001: parse error — ambiguous precedence
```

---

## Type rules

```
Γ ⊢ a : A | null     Γ ⊢ b : B
──────────────────────────────────── (nullish-null)
Γ ⊢ a ?? b : A | B

Γ ⊢ a : A | undefined     Γ ⊢ b : B
──────────────────────────────────────── (nullish-undef)
Γ ⊢ a ?? b : A | B

Γ ⊢ a : A | null | undefined     Γ ⊢ b : B
────────────────────────────────────────────── (nullish-both)
Γ ⊢ a ?? b : A | B

Γ ⊢ a : A     null ∉ A     undefined ∉ A
────────────────────────────────────────── (nullish-noop)
Γ ⊢ a ?? b : A     -- b branch unreachable; SJS-W005 may fire
```

When `B <: A`, the result type simplifies to `A` — the union collapses. The type-checker performs this simplification automatically.

For `??=`: after the statement `a ??= b` where `a: T | null` and `b: B`:

```
Γ ⊢ a : T | null     Γ ⊢ b : B     B <: T
────────────────────────────────────────────── (nullish-assign)
Γ' ⊢ a : T      (null branch replaced; if B <: T, result is T)
```

---

## JS Lowering (Prototype)

For ES2020+ targets, `??` passes through natively. For ES5 targets, the compiler emits a conditional expression. `??=` (ES2021) is lowered to a conditional assignment for older targets.

```sjs
// SJS input
const label: string = title ?? "Untitled";

let port: number? = null;
port ??= 8080;
```

```javascript
// JS output (ES2020+ — pass-through)
const label = title ?? "Untitled";
let port = null;
port ??= 8080;

// JS output (ES5 target — polyfill)
const label = (title !== null && title !== undefined) ? title : "Untitled";
let port = null;
if (port === null || port === undefined) { port = 8080; }
```

---

## LLVM Lowering (Future)

```llvm
; a ?? b  where a: Nullable<T>
%is_null = extractvalue %Nullable_T %a, 0
%is_null_i1 = icmp eq i1 %is_null, 0   ; 0 = no value = nullish
br i1 %is_null_i1, label %use_b, label %use_a

use_a:
  %a_val = extractvalue %Nullable_T %a, 1
  br label %merge

use_b:
  ; evaluate b
  br label %merge

merge:
  %result = phi <T> [ %a_val, %use_a ], [ %b_val, %use_b ]

; ??= is equivalent: only store if null tag was set
```

For pointer-represented nullables (objects, strings), the null pointer serves as the null sentinel — no tag extraction is needed; use a single `icmp eq ptr, null` check.

---

## Diagnostic codes

| Code | When emitted |
|------|-------------|
| `SJS-E001` | Result of `??` assigned to a type that does not accommodate both branches |
| `SJS-P001` | `??` chained with `\|\|` or `&&` without explicit parentheses |

---

## Examples

### Valid

```sjs
// Basic nullish fallback
function display(label: string?): string {
  return label ?? "(none)";
}

// Preserves falsy non-null values
const timeout: number = userTimeout ?? 5000;
// If userTimeout is 0, result is 0 — not 5000

// Nullish assignment to initialize lazily
type Cache { data: string?; }
function getOrInit(c: Cache): string {
  c.data ??= "default";
  return c.data;
}

// Chained optional + nullish coalescing
type User { profile?: { displayName?: string; } }
function getName(u: User): string {
  return u.profile?.displayName ?? "Anonymous";
}

// ??= with nullable let
let config: string? = null;
config ??= "production";
// config is now "production"
```

### Invalid

```sjs
// SJS-E001: result not assignable to declared type
const name: string = (null as string?) ?? null;
//                                        ^^^^ SJS-E001: null is not assignable to string

// SJS-P001: ?? mixed with || without parens
const val = a ?? b || c;
//              ^^^^^^^^ SJS-P001: ?? cannot be mixed with || without parentheses

// SJS-W005: ?? on non-nullable operand (left branch always taken)
const fixed: string = "hello";
const result = fixed ?? "unused";
//             ^^^^^ SJS-W005: left side of ?? is never null or undefined
```


# 033 — Logical Assignment

**Status:** Stage 1 — implemented
**Grammar:** `specs/grammar.ebnf` §AssignmentOperator, §AssignmentExpression

---

## Syntax

```ebnf
<AssignmentExpression> ::= <ConditionalExpression>
                         | <LeftHandSideExpression> <AssignmentOperator> <AssignmentExpression>

<AssignmentOperator>   ::= "="  | "+=" | "-=" | "*=" | "/=" | "%="
                         | "&&=" | "||=" | "??="
```

Three logical assignment operators: `&&=`, `||=`, and `??=`. The LHS must be an assignable target (variable binding or property access).

---

## Semantics

Logical assignment operators combine a short-circuit logical evaluation with a conditional assignment. The RHS is evaluated only when the assignment will actually occur.

### `a &&= b` — logical AND assignment

Equivalent to `a && (a = b)`. The assignment occurs only if `a` is truthy. If `a` is falsy, `a` retains its current value and `b` is not evaluated.

Use case: update a field only when the object/field is present and truthy.

### `a ||= b` — logical OR assignment

Equivalent to `a || (a = b)`. The assignment occurs only if `a` is falsy. If `a` is truthy, `a` retains its current value and `b` is not evaluated.

Use case: provide a fallback for any falsy value (including `0`, `""`, `false`).

### `a ??= b` — nullish assignment

Equivalent to `a ?? (a = b)`. The assignment occurs only if `a` is `null` or `undefined`. Non-null falsy values (`0`, `""`, `false`) do not trigger the assignment.

Use case: lazy initialization — assign a default only when a value is absent.

### Short-circuit evaluation

All three operators are short-circuit: the RHS is not evaluated if the condition is not met. This matters when the RHS has side effects.

```sjs
// b() is called only when obj.count is falsy
obj.count ||= computeDefault();
```

---

## Type rules

```
Γ ⊢ a : T     Γ ⊢ b : S
──────────────────────────────────── (and-assign)
Γ' ⊢ a &&= b    →  a : T & S in truthy branch
-- After &&=: a was truthy (T) and is now S; narrowed to T ∩ S

Γ ⊢ a : T     Γ ⊢ b : S
──────────────────────────────────── (or-assign)
Γ' ⊢ a ||= b    →  a : T | S
-- After ||=: a was falsy (took b) or truthy (kept T)

Γ ⊢ a : T | null     Γ ⊢ b : S
──────────────────────────────────── (nullish-assign)
Γ' ⊢ a ??= b    →  a : T | S
-- After ??=: null branch replaced with S; non-null T retained

Γ ⊢ a : T | undefined     Γ ⊢ b : S
────────────────────────────────────── (nullish-assign-undef)
Γ' ⊢ a ??= b    →  a : T | S
```

The LHS must be a mutable binding or writable property. Applying any logical assignment to a `const` binding is SJS-E001.

Type compatibility: the RHS type `S` must be assignable to the declared type of `a`. If `a: T` and `S` is not `<: T`, SJS-E001 is emitted.

---

## JS Lowering (Prototype)

For ES2021+ targets, all three operators pass through natively. For older targets, each is desugared to a conditional expression.

```sjs
// SJS input
let active: boolean = false;
active ||= computeDefault();

let name: string? = null;
name ??= "Anonymous";

let score: number = 10;
score &&= score * 2;
```

```javascript
// JS output (ES2021+ — pass-through)
let active = false;
active ||= computeDefault();

let name = null;
name ??= "Anonymous";

let score = 10;
score &&= score * 2;

// JS output (ES5 target — desugar)
let active = false;
active || (active = computeDefault());

let name = null;
(name === null || name === undefined) && (name = "Anonymous");

let score = 10;
score && (score = score * 2);
```

---

## LLVM Lowering (Future)

Control-flow analysis informs the branch structure. Each logical assignment compiles to a conditional branch followed by a store, unified by a phi node.

```llvm
; score &&= score * 2
%score_val = load double, double* %score
%truthy = fcmp une double %score_val, 0.0   ; non-zero = truthy
br i1 %truthy, label %do_assign, label %skip

do_assign:
  %new_val = fmul double %score_val, 2.0
  store double %new_val, double* %score
  br label %skip

skip:
  ; %score now holds updated value (or unchanged if falsy)

; name ??= "Anonymous"  where name: Nullable<string*>
%name_ptr = load %SjsString*, %SjsString** %name
%is_null  = icmp eq %SjsString* %name_ptr, null
br i1 %is_null, label %assign_default, label %keep

assign_default:
  store %SjsString* @__sjs_str_anonymous, %SjsString** %name
  br label %keep

keep:
```

---

## Diagnostic codes

| Code | When emitted |
|------|-------------|
| `SJS-E001` | LHS is a `const` binding; logical assignment to const is forbidden |
| `SJS-E001` | RHS type is not assignable to the declared type of LHS |

---

## Examples

### Valid

```sjs
// ||= to provide falsy fallback
let port: number = 0;
port ||= 3000;
// port is now 3000 (0 was falsy)

// ??= for null-only initialization
let title: string? = null;
title ??= "Untitled";
// title is now "Untitled"

// &&= to update only when present/truthy
type Counter { hits: number; }
function increment(c: Counter): void {
  c.hits &&= c.hits + 1;
}

// ??= on object property
type Config { timeout: number?; }
function normalize(cfg: Config): void {
  cfg.timeout ??= 5000;
}

// ||= for lazy default
let cached: string = "";
cached ||= computeExpensiveDefault();
```

### Invalid

```sjs
// SJS-E001: &&= on const
const limit: number = 100;
limit &&= 200;
// ^^^^^ SJS-E001: cannot reassign const binding limit

// SJS-E001: RHS type incompatible with LHS
let name: string = "Alice";
name ??= 42;
//       ^^ SJS-E001: number is not assignable to string

// SJS-E001: ||= on const property (readonly)
type Frozen { readonly value: number; }
const f: Frozen = { value: 0 };
f.value ||= 1;
// ^^^^^^^ SJS-E001: cannot assign to readonly property value
```


# 034 — Destructuring

**Status:** Stage 1 — implemented
**Grammar:** `specs/grammar.ebnf` §VariableDeclarator, §ArrayBindingPattern, §ObjectBindingPattern, §AssignmentExpression

---

## Syntax

```ebnf
<ArrayBindingPattern>  ::= "[" [ <ArrayBindingElement>
                               { "," <ArrayBindingElement> }
                               [ "," "..." <Identifier> [ ":" <Type> ] ] ] "]"

<ArrayBindingElement>  ::= <BindingPattern> [ ":" <Type> ] [ "=" <Expression> ]
                         | ","   (* elision — skip element *)

<ObjectBindingPattern> ::= "{" [ <ObjectBindingElement>
                                { "," <ObjectBindingElement> }
                                [ "," "..." <Identifier> ] ] "}"

<ObjectBindingElement> ::= <Identifier> [ ":" <BindingPattern> ]
                           [ ":" <Type> ] [ "=" <Expression> ]
                         | <Identifier> "as" <Identifier> [ ":" <Type> ]
```

Destructuring is available in: variable declarations (`const`, `let`), assignment expressions, function parameters, and `for`/`for-of` loop variables.

---

## Semantics

### Array destructuring

Binds elements by position. The right-hand side must be an iterable. The first binding receives index 0, the second index 1, and so on.

- **Type annotation on element** — `[a: T]` — constrains the expected element type; if the source element type is not `<: T`, SJS-E001 is emitted.
- **Default value** — `[a = 0]` — used when the element is `undefined` (not when `null`). The type of `a` after applying the default is `T` (the default removes `undefined` from consideration).
- **Rest element** — `[first, ...rest: T[]]` — `rest` collects all remaining elements as `T[]`. Rest must be the last element.
- **Elision** — `[, second]` — skips an element by position.
- **Nested** — `[[x, y], z]` — destructuring patterns may be nested arbitrarily.

### Object destructuring

Binds properties by name. The right-hand side must be an object (non-null).

- **Simple binding** — `{ name }` — binds the property `name` to a local variable also named `name`.
- **Rename** — `{ name: localName }` or `{ name as localName }` — binds property `name` to `localName`.
- **Type annotation** — `{ name: string }` — constrains the property type.
- **Default value** — `{ port = 3000 }` — used when the property is `undefined`.
- **Rest element** — `{ a, b, ...rest }` — `rest` receives all own enumerable properties not explicitly named.
- **Nested** — `{ address: { city } }` — nested object patterns.

### Destructuring in function parameters

Parameters may use any binding pattern. Type annotations in parameter destructuring are checked against the call-site argument type.

```sjs
function render({ width: number, height: number }): void { ... }
```

### Tuple destructuring

When the source is a tuple type `[A, B, C]`, destructuring is checked element-by-element against the tuple's element types. Destructuring more elements than the tuple has is SJS-E002.

---

## Type rules

```
Γ ⊢ e : { p: S }     S <: T
─────────────────────────────────── (obj-destructure-typed)
Γ ⊢ const { p: T } = e : Γ[p ↦ T]

Γ ⊢ e : { p: S }
─────────────────────────────────── (obj-destructure-inferred)
Γ ⊢ const { p } = e : Γ[p ↦ S]

Γ ⊢ e : [S, ...]     S <: T
─────────────────────────────────── (arr-destructure-typed)
Γ ⊢ const [a: T, ...] = e : Γ[a ↦ T]

Γ ⊢ e : T[]
─────────────────────────────────── (arr-rest)
Γ ⊢ const [first, ...rest] = e : Γ[first ↦ T, rest ↦ T[]]

Γ ⊢ e : { p?: S }
─────────────────────────────────── (obj-optional-prop)
Γ ⊢ const { p } = e : Γ[p ↦ S | undefined]

Γ ⊢ e : { p?: S }     Γ ⊢ d : S
─────────────────────────────────── (obj-default)
Γ ⊢ const { p = d } = e : Γ[p ↦ S]
```

---

## JS Lowering (Prototype)

Type annotations are erased. Rename syntax (`as`) is normalized. All other destructuring constructs pass through as standard JS destructuring.

```sjs
// SJS input
const { x: number, y: number } = origin;
const { host: string = "localhost", port: number = 3000 } = config;
const [first: string, ...rest: string[]] = items;
const { name as displayName: string } = user;
```

```javascript
// JS output
const { x, y } = origin;
const { host = "localhost", port = 3000 } = config;
const [first, ...rest] = items;
const { name: displayName } = user;
```

No helper functions are emitted. The structural match guarantee is enforced at type-check time only.

---

## LLVM Lowering (Future)

```llvm
; Object destructuring: { x, y } from a struct
; Struct layout: %Point = { double x, double y }
%x = getelementptr %Point, %Point* %origin, i32 0, i32 0
%x_val = load double, double* %x

%y = getelementptr %Point, %Point* %origin, i32 0, i32 1
%y_val = load double, double* %y

; Array destructuring: [first, ...rest] from T[]
; SJS array layout: { i64 len, T* data }
%data = getelementptr %Array_T, %Array_T* %arr, i32 0, i32 1
%data_ptr = load T*, T** %data
%first = load T, T* %data_ptr

; rest = slice starting at index 1 (runtime helper)
%rest = call %Array_T* @__sjs_array_slice(%Array_T* %arr, i64 1)
```

Struct field extraction is direct pointer arithmetic — no runtime overhead for known struct types.

---

## Diagnostic codes

| Code | When emitted |
|------|-------------|
| `SJS-E001` | Destructured element or property type is not assignable to declared annotation |
| `SJS-E002` | Tuple destructuring exceeds the number of elements in the source tuple type |
| `SJS-E003` | Object destructuring on a nullable source without prior null narrowing |

---

## Examples

### Valid

```sjs
type Point { x: number; y: number; }
const origin: Point = { x: 0, y: 0 };
const { x: number, y: number } = origin;

// Default values
type Options { timeout?: number; retries?: number; }
function connect({ timeout = 5000, retries = 3 }: Options): void { }

// Rename with type
type Response { statusCode: number; }
const res: Response = { statusCode: 200 };
const { statusCode as code: number } = res;

// Nested destructuring
type Nested { a: { b: number; }; }
const data: Nested = { a: { b: 42 } };
const { a: { b: number } } = data;

// Array rest
const nums: number[] = [1, 2, 3, 4];
const [head: number, ...tail: number[]] = nums;

// Tuple destructuring
const pair: [string, number] = ["age", 30];
const [label: string, value: number] = pair;
```

### Invalid

```sjs
// SJS-E001: annotation mismatch
const pt: Point = { x: 1, y: 2 };
const { x: string } = pt;
//         ^^^^^^ SJS-E001: number is not assignable to string

// SJS-E002: destructuring more elements than tuple has
const t: [number, string] = [1, "a"];
const [a, b, c] = t;
//           ^ SJS-E002: index 2 is out of bounds for tuple [number, string]

// SJS-E003: destructuring nullable object
function getCoords(p: Point?): number {
  const { x } = p;
  //            ^ SJS-E003: p is Point? — null-check required before destructuring
  return x;
}
```


# 035 — Spread and Rest

**Status:** Stage 1 — implemented
**Grammar:** `specs/grammar.ebnf` §ArrayLiteral, §ObjectLiteral, §ArgumentList, §FormalParameters

---

## Syntax

```ebnf
(* Spread in array literal *)
<ArrayLiteral>    ::= "[" [ <ArrayElement> { "," <ArrayElement> } ] "]"
<ArrayElement>    ::= <AssignmentExpression>
                    | "..." <AssignmentExpression>

(* Spread in object literal *)
<ObjectLiteral>   ::= "{" [ <PropertyDefinition> { "," <PropertyDefinition> } ] "}"
<PropertyDefinition> ::= <Identifier>
                       | <Identifier> ":" <AssignmentExpression>
                       | "..." <AssignmentExpression>

(* Spread in function call *)
<ArgumentList>    ::= <AssignmentExpression> { "," <AssignmentExpression> }
                    | "..." <AssignmentExpression>
                    | <ArgumentList> "," "..." <AssignmentExpression>

(* Rest in function parameters *)
<FormalParameters> ::= [ <FormalParameter> { "," <FormalParameter> } ]
                       [ "," "..." <Identifier> [ ":" <Type> ] ]
<FormalParameter>  ::= <Identifier> [ "?" ] ":" <Type> [ "=" <Expression> ]
```

---

## Semantics

### Array spread `[...a, ...b]`

Expands an iterable into an array literal. Both `a` and `b` must be iterables with compatible element types. The result is a new array containing all elements from each spread operand, in order.

Multiple spreads may appear in a single array literal alongside non-spread elements:

```sjs
const merged: number[] = [0, ...a, ...b, 99];
```

### Object spread `{ ...obj }`

Copies all own enumerable properties from `obj` into the new object literal. Later properties override earlier ones when property names collide. The type of the result is the structural merge of all spread sources and explicitly named properties.

In SJS v1, the type of a spread-merged object must be declared explicitly if it needs a named type — the compiler does not synthesize an anonymous intersection type (intersection types are banned; see `specs/language/007-banned-features.md`). Later spread properties override earlier ones in terms of runtime value, but the declared type must accommodate all named properties.

### Function call spread `f(...arr)`

Spreads an array as positional arguments. The spread must be compatible with the rest parameter or the remaining positional parameter types of the target function.

### Rest parameter `...args: T[]`

Collects all remaining positional arguments into an array of type `T[]`. A rest parameter must be the last parameter in the parameter list. A function may have at most one rest parameter.

Inside the function body, `args` has type `T[]`. The caller may pass zero or more arguments beyond the required positional parameters; all are collected.

---

## Type rules

```
Γ ⊢ a : T[]     Γ ⊢ b : T[]
──────────────────────────────── (array-spread-same)
Γ ⊢ [...a, ...b] : T[]

Γ ⊢ a : S[]     Γ ⊢ b : T[]     S ≠ T
──────────────────────────────────────── (array-spread-union)
Γ ⊢ [...a, ...b] : (S | T)[]

Γ ⊢ a : A     Γ ⊢ b : B     A, B are object types
──────────────────────────────────────────────────── (obj-spread)
Γ ⊢ { ...a, ...b } : declared type required for named use

Γ ⊢ args : T[]     f params end with ...rest: T[]
──────────────────────────────────────────────────── (call-spread)
Γ ⊢ f(...args) : ReturnType(f)

──────────────────────────────────────────────────── (rest-param)
Γ, args: T[] ⊢ function f(...args: T[]): R
```

For object spread, the result type must be explicitly annotated when used as a named type; the compiler does not derive an implicit intersection.

---

## JS Lowering (Prototype)

Array spread passes through for ES2015+ targets. Object spread passes through for ES2018+ targets or is lowered to `Object.assign` for older targets. Rest parameters pass through for ES2015+.

```sjs
// SJS input
const a: number[] = [1, 2, 3];
const b: number[] = [4, 5, 6];
const merged: number[] = [...a, ...b];

type Options { timeout: number; retries: number; }
const defaults: Options = { timeout: 5000, retries: 3 };
const overrides: Options = { ...defaults, timeout: 1000 };

function sum(...nums: number[]): number {
  return nums.reduce((acc: number, n: number) => acc + n, 0);
}
```

```javascript
// JS output (ES2018+ target — pass-through)
const a = [1, 2, 3];
const b = [4, 5, 6];
const merged = [...a, ...b];

const defaults = { timeout: 5000, retries: 3 };
const overrides = { ...defaults, timeout: 1000 };

function sum(...nums) {
  return nums.reduce((acc, n) => acc + n, 0);
}

// JS output (ES5 target)
const merged = a.concat(b);
const overrides = Object.assign({}, defaults, { timeout: 1000 });
function sum() {
  const nums = Array.prototype.slice.call(arguments);
  return nums.reduce(function(acc, n) { return acc + n; }, 0);
}
```

---

## LLVM Lowering (Future)

```llvm
; Array spread: [...a, ...b]
; SJS array layout: { i64 len, T* data }
%len_a = getelementptr %Array_T, %Array_T* %a, i32 0, i32 0
%len_a_val = load i64, i64* %len_a
%len_b = getelementptr %Array_T, %Array_T* %b, i32 0, i32 0
%len_b_val = load i64, i64* %len_b
%total_len = add i64 %len_a_val, %len_b_val

; allocate result array, then memcpy data from a and b
%result = call %Array_T* @__sjs_array_alloc(i64 %total_len)
call void @__sjs_array_concat(%Array_T* %result, %Array_T* %a, %Array_T* %b)

; Object spread: { ...a, ...b }
; Compile-time known struct layout — generate field-by-field copy
; Runtime unknown structs — call @__sjs_obj_spread helper
```

---

## Diagnostic codes

| Code | When emitted |
|------|-------------|
| `SJS-E002` | Spread element type is not assignable to the array element type |
| `SJS-E002` | Call-site spread array element type does not match function parameter type |

---

## Examples

### Valid

```sjs
// Array spread — same element type
const xs: number[] = [1, 2];
const ys: number[] = [3, 4];
const all: number[] = [...xs, ...ys, 5];

// Object spread — explicit result type
type Point { x: number; y: number; }
type Point3D { x: number; y: number; z: number; }
const p2: Point = { x: 1, y: 2 };
const p3: Point3D = { ...p2, z: 3 };

// Rest parameter
function log(prefix: string, ...messages: string[]): void {
  messages.forEach((m: string) => console.log(prefix + m));
}
log("INFO:", "server started", "port 8080");

// Spread into call
const args: number[] = [1, 2, 3];
Math.max(...args);
```

### Invalid

```sjs
// SJS-E002: incompatible spread types in strict array context
const strs: string[] = ["a", "b"];
const nums: number[] = [1, 2];
const bad: string[] = [...strs, ...nums];
//                              ^^^^^^ SJS-E002: number is not assignable to string

// SJS-E002: spread mismatch at call site
function add(a: number, b: number): number { return a + b; }
const strArgs: string[] = ["x", "y"];
add(...strArgs);
//  ^^^^^^^^^ SJS-E002: string is not assignable to number at parameter position
```


# 036 — Template Literals

**Status:** Stage 1 — implemented
**Grammar:** `specs/grammar.ebnf` §TemplateLiteral, §PrimaryExpression

---

## Syntax

```ebnf
<TemplateLiteral>   ::= "`" { <TemplateCharacter> | "${" <Expression> "}" } "`"
<TemplateCharacter> ::= (* any character except ` and ${ sequence *)

<TaggedTemplate>    ::= <MemberExpression> <TemplateLiteral>
                      | <CallExpression>   <TemplateLiteral>
```

Template literals begin and end with a backtick (`` ` ``). Embedded expressions are delimited by `${` and `}`. Tagged templates prefix a template literal with a tag expression.

---

## Semantics

### Untagged template literals

An untagged template literal produces a `string`. Embedded expressions are coerced to string via the abstract `ToString` operation. Any type may appear inside `${}` — the coercion is implicit.

Under `--strict`, embedding a `dynamic` expression emits SJS-W002 (untyped interpolation) to encourage explicit string conversion.

Multi-line template literals preserve whitespace and newline characters as written in source.

Escape sequences: `\n`, `\t`, `\\`, `` \` ``, `\${` (escaped interpolation). Unicode escapes `\uXXXX` and `\u{XXXXX}` are supported.

### Tagged template literals

A tagged template invokes a tag function with the following signature:

```sjs
type Tag<R> = (strings: TemplateStringsArray, ...values: dynamic[]) => R;
```

The tag receives:
- `strings` — a `TemplateStringsArray` (a frozen `string[]` with an additional `.raw` property containing the raw, un-escaped string parts). Length is always one more than the number of interpolations.
- `...values` — the evaluated interpolation expressions, passed as individual arguments.

The result type of a tagged template expression is the return type of the tag function.

### Built-in SJS tags

SJS provides typed built-in tags as part of the standard library:

| Tag | Return type | Purpose |
|-----|-------------|---------|
| `sql` | `SqlQuery` | Type-safe SQL query construction |
| `html` | `HtmlFragment` | Safe HTML fragment construction |
| `css` | `CssRule` | Scoped CSS rule construction |

These tags enforce that interpolated values conform to safe types for their respective domains.

---

## Type rules

```
Γ ⊢ e₁ : T₁  …  Γ ⊢ eₙ : Tₙ
────────────────────────────────────── (template-str)
Γ ⊢ `...${e₁}...${eₙ}...` : string

Γ ⊢ tag : (TemplateStringsArray, T₁, …, Tₙ) => R
Γ ⊢ e₁ : T₁  …  Γ ⊢ eₙ : Tₙ
────────────────────────────────────────────────────── (tagged-template)
Γ ⊢ tag`...${e₁}...${eₙ}...` : R
```

For typed built-in tags, the interpolated value types are checked against the tag's declared value parameter types. An interpolated `string` in an `sql` tag context is accepted; an interpolated user-controlled `dynamic` in `sql` context emits SJS-W002 or requires an explicit cast to a safe wrapper type.

---

## JS Lowering (Prototype)

Untagged and tagged template literals pass through unchanged to the JS output. SJS adds no transformation beyond type erasure.

```sjs
// SJS input
const name: string = "World";
const greeting: string = `Hello, ${name}!`;

const query: SqlQuery = sql`SELECT * FROM users WHERE id = ${userId}`;
```

```javascript
// JS output
const name = "World";
const greeting = `Hello, ${name}!`;

const query = sql`SELECT * FROM users WHERE id = ${userId}`;
```

For ES5 targets, untagged template literals are lowered to string concatenation. Tagged templates are lowered to explicit function calls.

```javascript
// ES5 output for untagged
const greeting = "Hello, " + name + "!";

// ES5 output for tagged
const query = sql(Object.freeze(
  Object.assign(["SELECT * FROM users WHERE id = ", ""], {
    raw: ["SELECT * FROM users WHERE id = ", ""]
  })
), userId);
```

---

## LLVM Lowering (Future)

```llvm
; Untagged: `Hello, ${name}!`
; Compile to runtime string concat via @__sjs_str_concat
%part0 = getelementptr [8 x i8], [8 x i8]* @.str.hello, i32 0, i32 0
%name_str = load %SjsString*, %SjsString** %name
%part1 = getelementptr [2 x i8], [2 x i8]* @.str.bang, i32 0, i32 0
%result = call %SjsString* @__sjs_str_concat3(
            i8* %part0, %SjsString* %name_str, i8* %part1)

; Tagged template: tag`a ${v} b`
; The strings array is interned as a global constant
@.template_strings = global [2 x %SjsString*] [
  %SjsString* @.str.a_space,
  %SjsString* @.str.space_b
]
%result = call %TagResult* @tag(
            [2 x %SjsString*]* @.template_strings, %Value* %v)
```

---

## Diagnostic codes

| Code | When emitted |
|------|-------------|
| `SJS-W002` | `dynamic` expression interpolated inside a template literal under `--strict` |
| `SJS-E002` | Tagged template interpolation type does not match tag's parameter type |

---

## Examples

### Valid

```sjs
// Basic string interpolation
const user: string = "Alice";
const msg: string = `Welcome back, ${user}!`;

// Multi-line
const multiline: string = `
  Line one
  Line two
`;

// Expression in interpolation
const a: number = 3;
const b: number = 4;
const hypotenuse: string = `hypotenuse = ${Math.sqrt(a * a + b * b)}`;

// Tagged template with typed return
const id: number = 42;
const query: SqlQuery = sql`SELECT * FROM orders WHERE user_id = ${id}`;

const fragment: HtmlFragment = html`<p>Hello, ${user}!</p>`;
```

### Invalid

```sjs
// SJS-W002: dynamic in strict mode
function render(value: dynamic): string {
  return `result: ${value}`;
  //               ^^^^^ SJS-W002: dynamic expression in template literal (--strict)
}

// SJS-E002: wrong type for typed tag
function strictTag(strings: TemplateStringsArray, ...nums: number[]): string {
  return strings.join("");
}
const label: string = strictTag`count = ${"not a number"}`;
//                                        ^^^^^^^^^^^^^^^ SJS-E002: string is not assignable to number
```


# 037 — Async / Await

**Status:** Stage 1 — implemented
**Grammar:** `specs/grammar.ebnf` §FunctionDeclaration, §FunctionExpression, §ArrowFunction, §UnaryExpression

---

## Syntax

```ebnf
<AsyncFunctionDecl>  ::= "async" "function" <Identifier>
                         "(" <FormalParameters> ")" ":" <Type>
                         <Block>

<AsyncFunctionExpr>  ::= "async" "function" [ <Identifier> ]
                         "(" <FormalParameters> ")" ":" <Type>
                         <Block>

<AsyncArrowFunction> ::= "async" <Identifier> "=>" <ConciseBody>
                       | "async" "(" <FormalParameters> ")" ":" <Type> "=>" <ConciseBody>

<AwaitExpression>    ::= "await" <UnaryExpression>

<ForAwaitStatement>  ::= "for" "await" "(" <ForDeclaration> "of" <Expression> ")" <Statement>
```

`async` is a modifier on function declarations, function expressions, and arrow functions. `await` is a unary operator valid only inside an `async` function body (or at the top level of an ES module — see Semantics).

---

## Semantics

### `async` functions

An `async` function always returns a `Promise<T>` regardless of what its body returns. The return type annotation `T` in the source refers to the resolved value — the compiler automatically wraps it in `Promise<T>` for the external signature.

If the body throws an exception, the returned promise is rejected with that exception. Callers must handle rejection via `.catch()` or a `try/catch` block wrapping an `await`.

### `await` expressions

`await expr` suspends the current async function until the promise `expr` settles. If `expr: Promise<T>`, then `await expr` has type `T`. If `expr` is not a `Promise`, it is implicitly wrapped in `Promise.resolve(expr)` and the result type is the type of `expr` itself.

`await` may only appear directly inside an `async` function body. Using `await` outside an async function (except at module top level) is SJS-P001.

### Top-level `await`

Top-level `await` is valid only in ES module files (files that contain `import` or `export` declarations, or files explicitly configured as modules). Using top-level `await` in a non-module script context is SJS-E018.

### Error handling

Inside an async function, `throw expr` rejects the enclosing promise. `try/catch` within an async function catches both synchronous throws and awaited rejections. Unawaited promise rejections are not caught by `try/catch`.

### `for await...of` — async iteration

Iterates over an `AsyncIterable<T>`. The loop variable has type `T`. The right-hand side must satisfy the `AsyncIterable<T>` object type (i.e., have a `[Symbol.asyncIterator]()` method returning `AsyncIterator<T>`). Each iteration implicitly awaits the next value.

```sjs
for await (const chunk: Buffer of stream) {
  process(chunk);
}
```

---

## Type rules

```
Γ, async ⊢ body : T   (returns T inside body)
──────────────────────────────────────────────── (async-fn)
Γ ⊢ async function f(): T { body } : () => Promise<T>

Γ ⊢ e : Promise<T>
──────────────────────────────────────────────── (await-promise)
Γ ⊢ await e : T

Γ ⊢ e : T    T ≠ Promise<_>
──────────────────────────────────────────────── (await-non-promise)
Γ ⊢ await e : T

Γ ⊢ iter : AsyncIterable<T>
──────────────────────────────────────────────── (for-await)
Γ ⊢ for await (const x of iter) { ... } : Γ[x ↦ T]
```

Nested `async` functions each carry their own async context. An inner `async` function does not share the `await` scope of an outer function — `await` inside an inner async function suspends the inner function, not the outer.

---

## JS Lowering (Prototype)

`async`/`await` passes through for ES2017+ targets. For ES5/ES6 targets, the compiler transpiles async functions to Promise chains using a state-machine transformation (equivalent to the regenerator-runtime async transform).

```sjs
// SJS input
async function fetchUser(id: number): User {
  const res: Response = await fetch(`/api/users/${id}`);
  const data: User    = await res.json();
  return data;
}
```

```javascript
// JS output (ES2017+ — pass-through, types erased)
async function fetchUser(id) {
  const res  = await fetch(`/api/users/${id}`);
  const data = await res.json();
  return data;
}

// JS output (ES5 target — Promise chain)
function fetchUser(id) {
  return Promise.resolve().then(function() {
    return fetch("/api/users/" + id);
  }).then(function(res) {
    return res.json();
  }).then(function(data) {
    return data;
  });
}
```

---

## LLVM Lowering (Future)

Async functions are compiled as LLVM coroutines using the `llvm.coro.*` intrinsic family. Each `await` site is a suspension point.

```llvm
; async function fetchUser(id: i64): Promise<User*>
define %Promise_User* @fetchUser(i64 %id) {
entry:
  %hdl = call token @llvm.coro.id(...)
  %frame = call i8* @llvm.coro.begin(%hdl, ...)

  ; await fetch(url)  →  suspension point 1
  %promise1 = call %Promise_Response* @fetch(%SjsString* %url)
  %suspend1 = call i8 @llvm.coro.suspend(token none, i1 false)
  switch i8 %suspend1, label %ret [ i8 0, label %resume1 ]

resume1:
  %res = call %Response* @__sjs_promise_result(%Promise_Response* %promise1)
  ; ... continue with res.json() await ...

ret:
  call void @llvm.coro.end(%hdl, i1 false)
  ret %Promise_User* %result_promise
}
```

---

## Diagnostic codes

| Code | When emitted |
|------|-------------|
| `SJS-E002` | `await` used on a value whose type is not `Promise<T>` in strict mode |
| `SJS-E018` | Top-level `await` used outside an ES module context |
| `SJS-P001` | `await` used outside an `async` function body |

---

## Examples

### Valid

```sjs
// Basic async/await
async function loadData(url: string): string {
  const response: Response = await fetch(url);
  return response.text();
}

// Async arrow function
const delay = async (ms: number): void => {
  await new Promise<void>((resolve: () => void) => setTimeout(resolve, ms));
};

// Error handling
async function safeLoad(url: string): string? {
  try {
    const r: Response = await fetch(url);
    return r.text();
  } catch (e) {
    return null;
  }
}

// for await...of
async function readLines(stream: AsyncIterable<string>): string[] {
  const lines: string[] = [];
  for await (const line: string of stream) {
    lines.push(line);
  }
  return lines;
}
```

### Invalid

```sjs
// SJS-P001: await outside async function
function syncFn(): void {
  const val = await somePromise;
  //          ^^^^^ SJS-P001: await is only valid inside an async function
}

// SJS-E018: top-level await in script (non-module) context
// (in a .sjs file without import/export)
const result = await fetch("/api");
//             ^^^^^ SJS-E018: top-level await requires ES module context
```


# 038 — Generators

**Status:** Stage 1 — implemented
**Grammar:** `specs/grammar.ebnf` §FunctionDeclaration, §FunctionExpression, §UnaryExpression

---

## Syntax

```ebnf
<GeneratorDecl>  ::= "function" "*" <Identifier>
                     "(" <FormalParameters> ")"
                     ":" <GeneratorType>
                     <Block>

<GeneratorExpr>  ::= "function" "*" [ <Identifier> ]
                     "(" <FormalParameters> ")"
                     ":" <GeneratorType>
                     <Block>

<GeneratorType>  ::= "Generator"      "<" <Type> "," <Type> "," <Type> ">"
                   | "AsyncGenerator" "<" <Type> "," <Type> "," <Type> ">"

<YieldExpression> ::= "yield" [ "*" ] [ <AssignmentExpression> ]

<AsyncGeneratorDecl> ::= "async" "function" "*" <Identifier>
                         "(" <FormalParameters> ")"
                         ":" <GeneratorType>
                         <Block>
```

The `*` suffix after `function` marks a generator. The `yield` expression is valid only inside a generator body. `yield*` delegates to another iterable.

---

## Semantics

### Generator functions

Calling a generator function does not execute the body immediately. Instead it returns a `Generator<Y, R, N>` object. The body executes only when the generator's `.next()` method is called.

Three type parameters:
- `Y` — the **yield type**: the type of values produced by `yield expr`.
- `R` — the **return type**: the type of the value produced when the generator function body reaches `return expr` or falls off the end.
- `N` — the **next type**: the type of the value passed into the generator via `.next(value)`. Inside the body, `const received: N = yield expr` captures this.

When the generator is exhausted (body returns), `.next()` returns `{ value: R, done: true }`. All prior `.next()` calls return `{ value: Y, done: false }`.

### `yield` expression

`yield expr` produces `expr` (type `Y`) to the consumer and suspends the generator. The expression `yield` (without an operand) produces `undefined` and suspends.

The value of the `yield` expression itself (the type of the whole `yield` expression in the body) is `N` — the value passed by the consumer via `.next(n)`.

### `yield*` — delegation

`yield* iterable` delegates to another iterable, forwarding all its yielded values to the consumer of the current generator. The type of `iterable` must be `Iterable<Y>` or `Generator<Y, SubReturn, N>`. The value of the `yield*` expression is the `SubReturn` type of the delegated generator (or `undefined` if delegating to a plain iterable).

### Async generators

`async function*` returns `AsyncGenerator<Y, R, N>`. Each `yield` inside an async generator may be preceded by `await`. Consumers iterate with `for await...of` or by calling `.next()` and awaiting the result.

### Generator protocol

`Generator<Y, R, N>` implements both `Iterator<Y, R, N>` and `Iterable<Y>`. It can therefore be used in `for...of` loops and with spread `[...gen]`. When used in `for...of`, the return value `R` is not accessible through the loop variable — only `Y` values are received.

---

## Type rules

```
Γ, yield:Y, return:R, next:N ⊢ body well-typed
──────────────────────────────────────────────────── (generator-fn)
Γ ⊢ function* f(): Generator<Y,R,N> { body }
      : () => Generator<Y,R,N>

Γ ⊢ e : Y     (inside generator with yield type Y)
──────────────────────────────────────────────────── (yield-expr)
Γ ⊢ yield e : N     -- result is the next-sent value

Γ ⊢ e : Y     (yield without value inside generator)
──────────────────────────────────────────────────── (yield-void)
Γ ⊢ yield : N

Γ ⊢ iter : Iterable<Y>
──────────────────────────────────────────────────── (yield-star-iterable)
Γ ⊢ yield* iter : void

Γ ⊢ gen : Generator<Y, S, N>
──────────────────────────────────────────────────── (yield-star-generator)
Γ ⊢ yield* gen : S     -- S is sub-generator's return type

Γ ⊢ e : R     (inside generator with return type R)
──────────────────────────────────────────────────── (generator-return)
Γ ⊢ return e : void    -- body ends; generator done
```

A `return` without a value in a generator body is typed as `return undefined`, so `R` must be `undefined` or `void` in that case, or SJS-E001 is emitted.

---

## JS Lowering (Prototype)

Generators pass through for ES2015+ targets (native generator support). For ES5 targets, the compiler transpiles to a state machine using a regenerator-style transform.

```sjs
// SJS input
function* range(start: number, end: number): Generator<number, void, undefined> {
  let i: number = start;
  while (i < end) {
    yield i;
    i++;
  }
}
```

```javascript
// JS output (ES2015+ — pass-through, types erased)
function* range(start, end) {
  let i = start;
  while (i < end) {
    yield i;
    i++;
  }
}

// JS output (ES5 target — state machine)
function range(start, end) {
  let i;
  let _state = 0;
  return {
    next: function() {
      switch (_state) {
        case 0: i = start; _state = 1;
        case 1:
          if (!(i < end)) { _state = 2; return { value: undefined, done: true }; }
          _state = 1;
          const _val = i; i++;
          return { value: _val, done: false };
        case 2: return { value: undefined, done: true };
      }
    },
    [Symbol.iterator]: function() { return this; }
  };
}
```

---

## LLVM Lowering (Future)

Generators compile to stackful coroutines using LLVM coroutine intrinsics. The generator frame is heap-allocated to support the suspension/resumption lifecycle.

```llvm
; function* range(start, end): Generator<f64, void, undef>
define %Generator_f64* @range(double %start, double %end) {
entry:
  %hdl  = call token @llvm.coro.id(...)
  %sz   = call i64 @llvm.coro.size.i64()
  %mem  = call i8* @__sjs_alloc(i64 %sz)
  %frame = call i8* @llvm.coro.begin(%hdl, i8* %mem)

  %i = alloca double
  store double %start, double* %i

loop:
  %i_val = load double, double* %i
  %cond  = fcmp olt double %i_val, %end
  br i1 %cond, label %do_yield, label %done

do_yield:
  ; yield i  →  suspend and return i to caller
  %suspend = call i8 @llvm.coro.suspend(token none, i1 false)
  ; store yield value in frame, return to caller
  switch i8 %suspend, label %done [ i8 0, label %resume ]

resume:
  %i_val2 = load double, double* %i
  %next   = fadd double %i_val2, 1.0
  store double %next, double* %i
  br label %loop

done:
  call void @llvm.coro.end(%hdl, i1 false)
  ret void
}
```

---

## Diagnostic codes

| Code | When emitted |
|------|-------------|
| `SJS-E001` | `yield` expression type does not match the generator's declared yield type `Y` |
| `SJS-E001` | `return` value type does not match the generator's declared return type `R` |
| `SJS-P001` | `yield` used outside a generator function body |

---

## Examples

### Valid

```sjs
// Simple number range generator
function* range(start: number, end: number): Generator<number, void, undefined> {
  let i: number = start;
  while (i < end) {
    yield i;
    i = i + 1;
  }
}

// Using the generator in for...of
for (const n: number of range(0, 5)) {
  console.log(n);
}

// Infinite generator with next-value input
function* accumulate(init: number): Generator<number, never, number> {
  let total: number = init;
  while (true) {
    const delta: number = yield total;
    total = total + delta;
  }
}

// yield* delegation
function* concat<T>(a: T[], b: T[]): Generator<T, void, undefined> {
  yield* a;
  yield* b;
}

// Async generator
async function* paginate(url: string): AsyncGenerator<string[], void, undefined> {
  let page: number = 1;
  while (true) {
    const data: string[] = await fetchPage(url, page);
    if (data.length === 0) return;
    yield data;
    page = page + 1;
  }
}
```

### Invalid

```sjs
// SJS-E001: yield type mismatch
function* strings(): Generator<string, void, undefined> {
  yield 42;
  //    ^^ SJS-E001: number is not assignable to yield type string
}

// SJS-E001: return type mismatch
function* withReturn(): Generator<number, string, undefined> {
  yield 1;
  return 99;
  //     ^^ SJS-E001: number is not assignable to return type string
}

// SJS-P001: yield outside generator
function normal(): void {
  yield 1;
  // ^^^ SJS-P001: yield is only valid inside a generator function
}
```


# 039 — JSX

**Status:** Stage 2 — planned
**Grammar:** `specs/grammar.ebnf` §JsxElement, §JsxFragment, §JsxSelfClosingElement, §JsxAttribute, §JsxChild

---

## Syntax

```ebnf
<JsxElement>          ::= <JsxOpeningElement> { <JsxChild> } <JsxClosingElement>
                        | <JsxSelfClosingElement>
                        | <JsxFragment>

<JsxFragment>         ::= "<>" { <JsxChild> } "</>"

<JsxSelfClosingElement> ::= "<" <JsxElementName> { <JsxAttribute> } "/>"

<JsxOpeningElement>   ::= "<" <JsxElementName> { <JsxAttribute> } ">"
<JsxClosingElement>   ::= "</" <JsxElementName> ">"

<JsxElementName>      ::= <Identifier>
                        | <Identifier> "." <Identifier>

<JsxAttribute>        ::= <Identifier> [ "=" <JsxAttributeValue> ]
                        | "{" "..." <AssignmentExpression> "}"

<JsxAttributeValue>   ::= <StringLiteral>
                        | "{" <AssignmentExpression> "}"
                        | <JsxElement>

<JsxChild>            ::= <JsxElement>
                        | "{" <AssignmentExpression> "}"
                        | <JsxText>

<JsxText>             ::= (* any characters except { } < > *)
```

JSX is enabled when the source file has extension `.sjsx` or when `"jsx": true` is set in `superjs.config.json`. The parser recognises JSX syntax only in JSX-enabled files.

---

## Semantics

### Element creation

JSX is syntactic sugar for calls to a configurable factory function. The factory is resolved from `superjs.config.json`:

```json
{ "jsx": { "factory": "React.createElement", "fragmentFactory": "React.Fragment" } }
```

`<Component prop={value} />` desugars to:

```javascript
React.createElement(Component, { prop: value })
```

`<div className="box">text</div>` desugars to:

```javascript
React.createElement("div", { className: "box" }, "text")
```

Fragments `<>...</>` desugar to:

```javascript
React.createElement(React.Fragment, null, ...children)
```

### Component resolution

- **Lowercase tag names** (`div`, `span`, `input`) — treated as HTML intrinsic elements; the factory receives a string literal as the first argument.
- **Capitalised tag names** (`Button`, `MyComponent`) — treated as component references; the identifier is resolved from the current scope; the factory receives the value directly.
- **Member access** (`Namespace.Component`) — resolved as a member expression.

### Children

Children may be: JSX elements, JSX text (string), or `{expr}` expression children. Expression children of type `null`, `undefined`, or `boolean` are conventionally not rendered — this is runtime behaviour, not a compile-time guarantee.

### Special attributes

- `key` — a `string | number` hint for reconciliation. Not passed to the component as a prop. Type: `string | number`.
- `ref` — a ref object or callback ref. Not passed as a prop. The type of `ref` is checked against the component's declared `ref` type if present.

### Spread attributes

`{...props}` spreads an object as attributes. The spread object type must be assignable to a subset of the component's props type.

---

## Type rules

```
Component : (props: P) => JSX.Element
attr_i : T_i    T_i <: PropType(P, name_i)
──────────────────────────────────────────────────── (jsx-component)
Γ ⊢ <Component name₁={v₁} … nameₙ={vₙ} /> : JSX.Element

tag ∈ JsxIntrinsics     attr_i <: IntrinsicProps(tag, name_i)
──────────────────────────────────────────────────────────────── (jsx-intrinsic)
Γ ⊢ <tag name₁={v₁} … /> : JSX.Element

──────────────────────────────────────────────────── (jsx-fragment)
Γ ⊢ <>{children}</> : JSX.Element

child ∈ { JSX.Element | string | number | boolean | null | undefined }
──────────────────────────────────────────────────── (jsx-child)
```

The global `JSX` namespace is provided by the SJS standard library or by `@types/react`. It declares `JSX.Element`, `JSX.IntrinsicElements`, and `JSX.ElementAttributesProperty`.

A required prop that is missing from a JSX element is SJS-E002. An unknown prop on an intrinsic element is SJS-E019.

---

## JS Lowering (Prototype)

JSX elements are transformed to factory calls. Types are erased.

```sjs
// SJS input
type ButtonProps { label: string; onClick: () => void; }

function Button({ label, onClick }: ButtonProps): JSX.Element {
  return <button onClick={onClick}>{label}</button>;
}

const el: JSX.Element = <Button label="Click me" onClick={() => console.log("clicked")} />;
const frag: JSX.Element = <><span>a</span><span>b</span></>;
```

```javascript
// JS output
function Button({ label, onClick }) {
  return React.createElement("button", { onClick }, label);
}

const el = React.createElement(Button, {
  label: "Click me",
  onClick: () => console.log("clicked")
});

const frag = React.createElement(React.Fragment, null,
  React.createElement("span", null, "a"),
  React.createElement("span", null, "b")
);
```

For Preact or other frameworks, configure `factory` and `fragmentFactory` in `superjs.config.json`.

---

## LLVM Lowering (Future)

JSX does not have a direct LLVM lowering target in the current roadmap. The LLVM backend targets native execution environments without a DOM. Future work may include:

- **React Native** — JSX → native widget calls via React Native's bridge.
- **Native UI frameworks** — JSX mapped to platform-specific widget creation APIs.
- **Server-side string rendering** — JSX → `@__sjs_html_concat` runtime calls producing `HtmlFragment` strings.

For now, the LLVM backend skips JSX files and defers to the JS prototype path for all UI rendering.

---

## Diagnostic codes

| Code | When emitted |
|------|-------------|
| `SJS-E002` | JSX attribute value type does not match the component's declared prop type |
| `SJS-E002` | Required prop is missing from a JSX element |
| `SJS-E019` | Unknown JSX element name (not in `JSX.IntrinsicElements` and not in scope) |
| `SJS-W007` | JSX element rendered inside a list without a `key` attribute |

---

## Examples

### Valid

```sjs
// Intrinsic element
const heading: JSX.Element = <h1 className="title">Hello</h1>;

// Component with typed props
type CardProps { title: string; body: string; }
function Card({ title, body }: CardProps): JSX.Element {
  return (
    <div className="card">
      <h2>{title}</h2>
      <p>{body}</p>
    </div>
  );
}

// Fragment
function List(): JSX.Element {
  return (
    <>
      <li>Item 1</li>
      <li>Item 2</li>
    </>
  );
}

// Spread props
type InputProps { placeholder: string; disabled: boolean; }
function StyledInput(props: InputProps): JSX.Element {
  return <input {...props} className="styled-input" />;
}

// List with keys
function ItemList(items: string[]): JSX.Element {
  return <ul>{items.map((item: string, i: number) => <li key={i}>{item}</li>)}</ul>;
}
```

### Invalid

```sjs
// SJS-E002: wrong prop type
type LabelProps { text: string; }
function Label({ text }: LabelProps): JSX.Element {
  return <span>{text}</span>;
}
const bad: JSX.Element = <Label text={42} />;
//                                   ^^ SJS-E002: number is not assignable to string

// SJS-E002: missing required prop
const missing: JSX.Element = <Label />;
//                            ^^^^^ SJS-E002: required prop text is missing

// SJS-E019: unknown element
const unknown: JSX.Element = <MyUndeclaredComponent />;
//                            ^^^^^^^^^^^^^^^^^^^^ SJS-E019: MyUndeclaredComponent is not in scope

// SJS-W007: list without key
function NoKeys(items: string[]): JSX.Element {
  return <ul>{items.map((item: string) => <li>{item}</li>)}</ul>;
  //                                      ^^^ SJS-W007: each list item should have a key attribute
}
```


# 040 — Control Flow
**Status:** Stage 1
**Grammar:** `specs/grammar.ebnf` §IterationStatement, §SelectionStatement, §JumpStatement

## Syntax (EBNF)

```ebnf
<IfStatement>       ::= "if" "(" <Expression> ")" <Statement>
                        [ "else" <Statement> ]

<SwitchStatement>   ::= "switch" "(" <Expression> ")" "{" <CaseClause>* "}"
<CaseClause>        ::= ( "case" <Expression> ":" | "default" ":" ) <Statement>*

<ForStatement>      ::= "for" "(" <ForInit> ";" <Expression>? ";" <Expression>? ")" <Statement>
<ForInit>           ::= <VariableDeclaration> | <Expression> | ε

<WhileStatement>    ::= "while" "(" <Expression> ")" <Statement>
<DoWhileStatement>  ::= "do" <Statement> "while" "(" <Expression> ")" ";"

<BreakStatement>    ::= "break" <Identifier>? ";"
<ContinueStatement> ::= "continue" <Identifier>? ";"
<LabeledStatement>  ::= <Identifier> ":" <Statement>

<DebuggerStatement> ::= "debugger" ";"
<WithStatement>     ::= "with" "(" <Expression> ")" <Statement>   ; BANNED — SJS-E013
```

## Semantics

**`if`/`else`:**
- `cond` accepts any type for truthiness testing (consistent with JS semantics).
- In strict mode, passing a non-`boolean` condition produces a lint suggestion (not an error).
- Type narrowing is applied in each branch. After `if (x === null)` the `else` branch narrows `x: T` (null stripped). After `if (x instanceof Error)` the `then` branch narrows `x: Error`.

**`switch`:**
- `switch (expr)` and each `case` value must be the same type in strict mode.
- Fall-through between cases is allowed but triggers **SJS-W008** unless the falling case ends with a line comment containing the exact text `// fallthrough` (case-insensitive).
- Empty cases (no statements before the next `case`) are implicitly annotated and do not trigger SJS-W008.
- `default` may appear anywhere but is evaluated last.

**`for` (C-style):**
- All three parts (`init`, `cond`, `update`) are optional.
- `init` may be a `let`/`const` declaration; the binding is scoped to the loop body.
- `cond` narrowing: same rules as `while`.

**`while`:**
- `cond` narrowing applies at loop entry. Type refinements inside the loop body do not persist across iterations.

**`do...while`:**
- Loop body executes once unconditionally before `cond` is checked.
- `cond` narrowing applies at the loop-continuation check, not at the start of the body.

**`break`/`continue` with labels:**
- Labels are scoped to the enclosing labeled statement.
- `break label` transfers control to the statement immediately after the labeled statement.
- `continue label` transfers control to the next iteration of the labeled loop.
- Labels must reference an enclosing iteration or switch statement for `continue`; any enclosing statement for `break`.

**`debugger`:**
- Legal SJS syntax; triggers **SJS-L005** in CI/committed code lint pass.

**`with`:** Banned — **SJS-E013** at parse time. No runtime semantics defined.

**Unreachable code:**
- Any statement following an unconditional `return`, `throw`, `break`, or `continue` within the same block is unreachable and triggers **SJS-W009**.

## Type Rules (Γ ⊢)

```
Γ ⊢ cond : T    Γ ⊢ then : A    Γ ⊢ else : B
────────────────────────────────────────────────
Γ ⊢ if (cond) then else : A | B

; Narrowing (null example):
Γ ⊢ x : T | null
────────────────────────────────────────────────
Γ, (x === null) ⊢ then: x narrows to null
Γ, ¬(x === null) ⊢ else: x narrows to T

; switch exhaustiveness:
Γ ⊢ expr : T    ∀ case v_i: Γ ⊢ v_i : T
────────────────────────────────────────────────
Γ ⊢ switch (expr) { case v_i: ... } : void
```

## JS Lowering (Prototype)

All control flow constructs pass through to JS output unchanged. No transforms required for the prototype target (`esnext`). For `es5` target:

- `let`/`const` in `for` init → `var` with IIFE wrapping if needed for loop-capture.
- All other control flow: direct pass-through.

## LLVM Lowering (Future)

| SJS construct | LLVM IR pattern |
|---|---|
| `if (c) T else F` | `br i1 %c, label %then, label %else` + `phi` for result |
| `switch (e) { case v: }` | `switch i64 %e, label %default [i64 v, label %case_v ...]` |
| `while (c) body` | header block: `br i1 %c, body, exit`; body: `br label %header` |
| `do body while (c)` | body block first; footer: `br i1 %c, body, exit` |
| `for (i;c;u) body` | init block → header (`br i1 %c`) → body → update → header |
| `break` | unconditional `br` to loop-exit block |
| `continue` | unconditional `br` to loop-header (or update) block |
| `break label` | unconditional `br` to block after labeled statement |
| `continue label` | unconditional `br` to header of labeled loop |
| `debugger` | no-op in release; `call void @llvm.debugtrap()` in debug builds |

## Diagnostic Codes

| Code | Severity | Trigger |
|------|----------|---------|
| SJS-W008 | Warning | Implicit fall-through in `switch` case (no `// fallthrough` comment) |
| SJS-W009 | Warning | Unreachable code after `return`/`throw`/`break`/`continue` |
| SJS-L005 | Lint | `debugger` statement present in committed code |
| SJS-E013 | Error | `with` statement used |

## Examples

### Valid

```sjs
// if/else with narrowing
function describe(x: string | null): string {
  if (x === null) {
    return "nothing";
  } else {
    return x.toUpperCase(); // x: string here
  }
}

// switch with explicit fallthrough annotation
switch (code) {
  case 200:
  case 201:
    handle(); // fallthrough from 200 — empty case, no warning
    break;
  case 204:
    log();
    // fallthrough
  case 205:
    finish();
    break;
}

// labeled break
outer: for (let i = 0; i < 10; i++) {
  for (let j = 0; j < 10; j++) {
    if (i + j > 15) break outer;
  }
}
```

### Invalid

```sjs
// SJS-E013: with is banned
with (obj) { x = 1; }

// SJS-W008: implicit fallthrough
switch (n) {
  case 1:
    doA();
  case 2:   // ← SJS-W008
    doB();
}

// SJS-W009: unreachable code
function f(): number {
  return 1;
  const x = 2; // ← SJS-W009
}

// SJS-E013 at parse — no fallthrough to rest of file
```


# 041 — Try / Catch / Finally
**Status:** Stage 1
**Grammar:** `specs/grammar.ebnf` §TryStatement

## Syntax (EBNF)

```ebnf
<TryStatement>  ::= "try" <BlockStatement>
                    ( <CatchClause> <FinallyClause>?
                    | <FinallyClause> )

<CatchClause>   ::= "catch" "(" <CatchBinding> ")" <BlockStatement>
                  | "catch" <BlockStatement>                          ; ES2019 optional binding

<CatchBinding>  ::= <Identifier> [ ":" <Type> ]

<FinallyClause> ::= "finally" <BlockStatement>

<ThrowStatement> ::= "throw" <Expression> ";"
```

## Semantics

**`try` block:**
- Executes normally; if any expression throws, control transfers to `catch` (if present) or `finally`.
- The try block introduces no new scope beyond its braces.

**`catch` clause:**
- Optional binding (ES2019): `catch { }` — omit the `(binding)` entirely when the caught value is irrelevant.
- Without a type annotation the catch binding has type `unknown` (strict mode) or `dynamic` (permissive mode). This is intentional: JS `throw` accepts any value.
- With a type annotation `catch (e: Error)`: the compiler inserts a runtime `instanceof` assertion. If the thrown value does not match, the error is re-thrown automatically.
- The catch binding is scoped to the catch block only.
- `catch (e: unknown)` is the recommended pattern: acknowledge the value may be anything, then narrow with `instanceof`.

**`finally` clause:**
- Always executes, whether the try block completes normally, throws, or returns.
- A `return` inside `finally` overrides any pending `throw` or `return` from `try`/`catch`. The compiler emits **SJS-W010** for this pattern.
- `finally` does not receive the thrown value; use `catch` if inspection is needed.

**`throw` statement:**
- In strict mode, throwing a non-`Error` value triggers **SJS-E002** (type mismatch — only `Error` or subclasses allowed).
- In permissive mode, `throw` accepts any value.

**`error.cause` (ES2022):**
- Constructor: `new Error("message", { cause: originalError })`.
- `error.cause` is typed `unknown` — the cause may be any value.
- Access: `(err as Error & { cause?: unknown }).cause` or via `instanceof` narrowing.

**Re-throw pattern (recommended):**
```sjs
try {
  riskyOp();
} catch (e: unknown) {
  if (e instanceof NetworkError) {
    handleNetwork(e); // e: NetworkError
  } else {
    throw e; // re-throw unrecognized errors
  }
}
```

## Type Rules (Γ ⊢)

```
; Unannotated catch binding in strict mode:
Γ ⊢ try { S₁ } catch (e) { S₂ }
  where e : unknown in Γ during S₂

; Annotated catch binding:
Γ ⊢ try { S₁ } catch (e: Error) { S₂ }
  where e : Error in Γ during S₂
  runtime check: if (!(e instanceof Error)) throw e;

; After instanceof narrowing:
Γ ⊢ e : unknown    Γ ⊢ e instanceof NetworkError : boolean
──────────────────────────────────────────────────────────
Γ, (e instanceof NetworkError) ⊢ e : NetworkError

; throw constraint (strict mode):
Γ ⊢ expr : T    T <: Error
───────────────────────────
Γ ⊢ throw expr : never
```

## JS Lowering (Prototype)

| SJS construct | JS output |
|---|---|
| `try { } catch (e: unknown) { }` | `try { } catch (e) { }` — annotation stripped |
| `try { } catch (e: Error) { }` | `try { } catch (e) { if (!(e instanceof Error)) throw e; ... }` |
| `catch { }` (no binding) | `catch (_e) { }` — synthetic unused binding for ES < 2019 targets |
| `throw expr` | `throw expr` — pass-through |
| `new Error("m", { cause: e })` | pass-through (ES2022+); polyfilled for older targets |

## LLVM Lowering (Future)

LLVM exception handling uses the Itanium ABI (`invoke`/`landingpad`/`resume`):

```llvm
; try block: calls become invokes
%result = invoke RetTy @riskyFn(...)
          to label %normal unwind label %landing_pad

landing_pad:
  %lp = landingpad { i8*, i32 }
          catch i8* @_ZTI5Error   ; catch Error type
  ; extract exception pointer
  %exc_ptr = extractvalue { i8*, i32 } %lp, 0
  %exc = call i8* @__cxa_begin_catch(i8* %exc_ptr)
  ; catch body
  call void @__cxa_end_catch()
  br label %finally_block

finally_block:
  ; always runs — either from normal path or from catch
  ; ...
  br label %exit

normal:
  br label %finally_block
```

- `finally` implemented as cleanup block invoked on both normal and exceptional paths.
- Typed catch `(e: Error)` uses LLVM type filter; unmatched exceptions call `__cxa_rethrow`.
- `throw expr` compiles to `__cxa_throw(ptr, typeinfo, destructor)`.

## Diagnostic Codes

| Code | Severity | Trigger |
|------|----------|---------|
| SJS-E002 | Error | `throw` with non-`Error` value in strict mode |
| SJS-W010 | Warning | Catch binding annotated with non-`Error` type in strict mode |
| SJS-W011 | Warning | `return` inside `finally` overrides pending throw/return |

## Examples

### Valid

```sjs
// Recommended: catch unknown, then narrow
try {
  fetchData();
} catch (e: unknown) {
  if (e instanceof Error) {
    console.error(e.message);
  } else {
    throw e;
  }
}

// Optional binding — don't care about the error value
try {
  JSON.parse(raw);
} catch {
  return null;
}

// error.cause chaining (ES2022)
try {
  connectDB();
} catch (e: unknown) {
  throw new Error("DB init failed", { cause: e });
}

// finally for cleanup
function withLock(fn: () => void): void {
  lock.acquire();
  try {
    fn();
  } finally {
    lock.release(); // always releases
  }
}
```

### Invalid

```sjs
// SJS-E002: throwing a string (strict mode)
throw "something went wrong";

// SJS-W010: annotating catch as non-Error
try { risky(); } catch (e: string) { } // ← SJS-W010

// SJS-W011: return in finally overrides throw
try {
  throw new Error("fail");
} finally {
  return 42; // ← SJS-W011 — swallows the thrown error
}
```


# 042 — for...of / for await...of / for...in
**Status:** Stage 1
**Grammar:** `specs/grammar.ebnf` §ForOfStatement, §ForInStatement

## Syntax (EBNF)

```ebnf
<ForOfStatement>    ::= "for" [ "await" ] "(" <ForBinding> "of" <Expression> ")" <Statement>
<ForInStatement>    ::= "for" "(" <ForBinding> "in" <Expression> ")" <Statement>

<ForBinding>        ::= <VariableKind> <BindingPattern> [ ":" <Type> ]
<VariableKind>      ::= "const" | "let" | "var"
<BindingPattern>    ::= <Identifier>
                      | "[" <ArrayBindingPattern> "]"
                      | "{" <ObjectBindingPattern> "}"
```

## Semantics

**`for...of`:**
- The iterable expression must be `Iterable<T>` for some type `T`.
- The loop variable is bound to each element with type `T` per iteration.
- If a type annotation is supplied (`const x: U of iter`), `T` must be assignable to `U`; the annotation is a narrowing assertion, not a widening.
- Destructuring patterns are fully supported in the loop binding.
- Any object implementing `[Symbol.iterator](): Iterator<T>` satisfies `Iterable<T>`.
- Built-in iterables: `Array<T>`, `Set<T>`, `Map<K,V>` (yields `[K,V]`), `string` (yields `string` — each code unit), generators.

**`for await...of`:**
- Iterable must be `AsyncIterable<T>` or `Iterable<T>` (sync iterables are wrapped automatically).
- Only valid inside an `async` function or at the top level of an ES module.
- Using `for await...of` outside async context is **SJS-E018** (top-level await outside module).
- Implements the async iteration protocol: calls `[Symbol.asyncIterator]()`, then `.next()` awaiting each result.

**`for...in`:**
- Iterates the string-keyed enumerable properties of an object, including inherited ones.
- The loop variable is always `string` regardless of the object's key type.
- **SJS-L004** is always emitted: prefer `for...of Object.keys(obj)` (own keys only, no prototype chain).
- `for...in` over an array iterates index strings (`"0"`, `"1"`, …) — rarely intended.
- `for...in` remains legal; SJS-L004 is a lint warning, not an error.

**Break/continue** inside `for...of`/`for...in`:
- `break` triggers the iterator's `.return()` method (if defined), enabling cleanup in generators.
- `continue` skips to the next `.next()` call.

## Type Rules (Γ ⊢)

```
; for...of — element type from iterable:
Γ ⊢ iter : Iterable<T>
──────────────────────────────────────────────
Γ ⊢ for (const x of iter) S
  where x : T in Γ during S

; for...of — with explicit annotation:
Γ ⊢ iter : Iterable<T>    T <: U
──────────────────────────────────────────────
Γ ⊢ for (const x: U of iter) S
  where x : U in Γ during S

; for await...of:
Γ ⊢ iter : AsyncIterable<T> | Iterable<T>    Γ ⊢ async-context
──────────────────────────────────────────────
Γ ⊢ for await (const x of iter) S
  where x : T in Γ during S

; for...in — always string keys:
Γ ⊢ obj : object
──────────────────────────────────────────────
Γ ⊢ for (const k in obj) S
  where k : string in Γ during S
```

## JS Lowering (Prototype)

| SJS construct | JS output (esnext target) |
|---|---|
| `for (const x: T of arr)` | `for (const x of arr)` — type annotation stripped |
| `for await (const x: T of iter)` | `for await (const x of iter)` — annotation stripped |
| `for (const k in obj)` | `for (const k in obj)` — pass-through (+ SJS-L004 at check time) |
| Destructuring binding | preserved as-is; only type annotation stripped |

**ES2015 target** (`for await...of`): compiled to manual async iterator protocol:
```javascript
const $iter = iter[Symbol.asyncIterator]
  ? iter[Symbol.asyncIterator]()
  : iter[Symbol.iterator]();
let $step;
while (!($step = await $iter.next()).done) {
  const x = $step.value;
  /* body */
}
```

## LLVM Lowering (Future)

`for...of` lowers to explicit iterator protocol calls:

```llvm
; for (const x of arr) where arr: Array<T>
%iter_obj = call %Iterator* @Array_iterator(%Array* %arr)

loop_header:
  %next_result = call %IterResult @Iterator_next(%Iterator* %iter_obj)
  %done = extractvalue %IterResult %next_result, 0   ; i1 done flag
  br i1 %done, label %loop_exit, label %loop_body

loop_body:
  %x = extractvalue %IterResult %next_result, 1      ; T value
  ; loop body using %x
  br label %loop_header

loop_exit:
  ; break path calls .return() if iterator supports it
```

`for...in`: runtime call to `Object.keys` equivalent; iterates `%SjsString*` array.

## Diagnostic Codes

| Code | Severity | Trigger |
|------|----------|---------|
| SJS-E002 | Error | Non-iterable expression in `for...of` |
| SJS-E018 | Error | `for await...of` outside `async` function or module top level |
| SJS-L004 | Lint | `for...in` used — prefer `for...of Object.keys()` |

## Examples

### Valid

```sjs
// Basic for...of
const nums: number[] = [1, 2, 3];
for (const n of nums) {
  console.log(n); // n: number
}

// Destructuring in for...of
const entries: [string, number][] = [["a", 1], ["b", 2]];
for (const [key, val] of entries) {
  console.log(key, val); // key: string, val: number
}

// Map iteration
const map = new Map<string, number>();
for (const [k, v] of map) {
  console.log(k, v); // k: string, v: number
}

// for await...of in async function
async function processStream(stream: AsyncIterable<string>): Promise<void> {
  for await (const chunk of stream) {
    process(chunk); // chunk: string
  }
}

// Custom iterable
function* range(n: number): Iterable<number> {
  for (let i = 0; i < n; i++) yield i;
}
for (const i of range(5)) {
  console.log(i);
}
```

### Invalid

```sjs
// SJS-E002: number is not iterable
for (const x of 42) { }   // ← SJS-E002

// SJS-L004: for...in warning
for (const key in obj) { } // ← SJS-L004

// SJS-E018: for await outside async
function sync(): void {
  for await (const x of asyncGen()) { } // ← SJS-E018
}

// Type annotation mismatch
const strs: string[] = ["a", "b"];
for (const x: number of strs) { } // ← SJS-E002: string not assignable to number
```


---

## 3. Type system {#3-type-system}

> **Grammar:** <Type>, <TypeDecl>, <MatchExpression> — see [`specs/grammar.ebnf`](./grammar.ebnf)  
> **Errors:** SJS-E001–SJS-E012, SJS-E020, SJS-W001–SJS-W010 — see [`specs/error-codes.md`](./error-codes.md)

# 001 — Null Safety

**Status:** Implemented (Stage 1 type-checker)
**Grammar:** `specs/grammar.ebnf` §Type, §Parameter, §InterfaceProperty

---

## Syntax

```ebnf
<Type>              ::= <PrimaryType> [ "?" ]
<PrimaryType>       ::= <Identifier>
                      | <PrimitiveType>
                      | <FunctionType>
                      | <ArrayType>
                      | <TupleType>
                      | <UnionType>
                      | "(" <Type> ")"

<Parameter>         ::= <Identifier> [ "?" ] ":" <Type>
                      | <Identifier> ":" <Type> [ "=" <Expression> ]

<InterfaceProperty> ::= [ "readonly" ] <Identifier> [ "?" ] ":" <Type> ";"
```

The `?` suffix on a type position is the nullable shorthand. The `?` suffix on a parameter name or property name marks that position as optional (distinct from nullable — see Semantics).

---

## Semantics

### Non-nullable by default

Every type `T` in SJS is non-nullable unless explicitly annotated. The value `null` is not a member of any non-nullable type. This is a core language invariant — it cannot be disabled by configuration.

### Nullable shorthand: `T?`

`T?` is syntactic sugar that desugars to the union `T | null`. The two forms are interchangeable in all type positions:

```
T?  ≡  T | null
```

`undefined` is NOT included. To include `undefined`, write `T | undefined` or `T | null | undefined` explicitly. `T?` never implies `T | null | undefined`.

### Optional property: `prop?: T`

A property declared as `prop?: T` on an object type has the type `T | undefined` within the object. When the property is absent from an object literal, its value is `undefined`. Inside a function or block that has narrowed the property to be present, its type is `T`.

```
{ prop?: T }  means: prop is absent (undefined) or T
```

### Optional parameter: `param?: T` and `param?: T`

A parameter declared as `p?: T` means the caller may omit the argument. Inside the function body, `p` has type `T | undefined`. To use `p` as `T`, the caller must narrow it first.

A parameter with a default value `p: T = default` is distinct: the parameter type is `T` inside the body (the default handles the absent case before body execution).

### `null` vs `undefined`

SJS treats `null` and `undefined` as distinct values with distinct types:

- `null` — intentional absence, part of `T?` via the `?` shorthand
- `undefined` — uninitialized / property-absent; written explicitly as `| undefined`

Neither is automatically included in any type. Both must be opted into explicitly.

---

## Type rules

### Assignability

```
────────────────── (null-literal)
Γ ⊢ null : null

────────────────── (null-sub-nullable)
null <: T?

────────────────── (T-sub-nullable)
T <: T?

────────────────── (nullable-expand)
T? ≡ T | null
```

A value of type `T` is assignable to `T?` (widening). A value of type `null` is assignable to `T?`. Neither is assignable to `T` without narrowing.

### Non-nullable enforcement

```
Γ ⊢ e : T      null ∉ T
──────────────────────────── (no-null-assign)
null  is not assignable to T          → SJS-E001
```

If the target type `T` does not contain `null` (i.e., `T` is not a union containing `null`), assigning `null` to it is a type error.

### Narrowing

After a null check, the type of a nullable variable is narrowed in the non-null branch:

```
Γ ⊢ x : T?
Γ, x : T ⊢ e : U    (branch where x !== null)
──────────────────────────────────────────────── (null-narrow)
in branch (x !== null): Γ ⊢ x : T
```

Control-flow narrowing forms:
- `if (x === null) { ... }` — in the else branch, `x : T`
- `if (x !== null) { ... }` — in the then branch, `x : T`
- `if (x == null) { ... }` — narrows both `null` and `undefined`
- Early return: `if (x === null) return;` — after the guard, `x : T`

### Optional chaining: `a?.b`

```
Γ ⊢ a : T?      PropType(T, 'b') = U
────────────────────────────────────── (opt-chain-nullable)
Γ ⊢ a?.b : U | undefined

Γ ⊢ a : T       PropType(T, 'b') = U
────────────────────────────────────── (opt-chain-nonnull)
Γ ⊢ a?.b : U
```

When `a` is `T?`, `a?.b` produces `U | undefined` (not `U | null`). This preserves the standard that `undefined` signals "short-circuit", distinct from a `null` payload.

Optional chaining applies to: property access (`?.`), method calls (`?.()`, `?.()`), and element access (`?.[key]`).

### Nullish coalescing: `a ?? b`

```
Γ ⊢ a : A | null      Γ ⊢ b : B
──────────────────────────────────── (nullish-coalesce-null)
Γ ⊢ a ?? b : A | B

Γ ⊢ a : A | undefined      Γ ⊢ b : B
──────────────────────────────────────── (nullish-coalesce-undef)
Γ ⊢ a ?? b : A | B
```

`??` provides a fallback when the left side is `null` or `undefined`. The result type is the union of the non-null/non-undefined left type with the right type.

---

## JS Lowering (Prototype)

`T?` is a type-level annotation erased at compile time. No runtime representation is generated.

```sjs
// SJS input
function greet(name: string?): string {
  return name ?? "stranger";
}
```

```javascript
// JS output (types erased)
function greet(name) {
  return name ?? "stranger";
}
```

Optional chaining `?.` compiles to native `?.` for ES2020+ targets. For ES5 targets, the compiler emits a conditional:

```sjs
// SJS input
const city = user?.address?.city;
```

```javascript
// JS output (ES2020 target)
const city = user?.address?.city;

// JS output (ES5 target)
const city = user === null || user === undefined
  ? undefined
  : (user.address === null || user.address === undefined
      ? undefined
      : user.address.city);
```

Nullish coalescing `??` compiles to native `??` for ES2020+ or a polyfill for ES5:

```javascript
// ES5 polyfill for: a ?? b
(a !== null && a !== undefined ? a : b)
```

---

## LLVM Lowering (Future)

Non-nullable types compile to bare values with no overhead — there is no tag, no pointer indirection, and no null check generated at use sites.

Nullable `T?` compiles to a tagged union:

```llvm
; Nullable<i64>: { i1 hasValue, i64 value }
%Nullable_i64 = type { i1, i64 }

; Constructing null:
%n = insertvalue %Nullable_i64 undef, i1 0, 0

; Constructing Some(42):
%n = insertvalue %Nullable_i64 { i1 1, i64 undef }, i64 42, 1

; Null check (a?.b pattern):
%hasVal = extractvalue %Nullable_i64 %a, 0
br i1 %hasVal, label %non_null, label %was_null
non_null:
  %inner = extractvalue %Nullable_i64 %a, 1
  ; access .b on %inner
was_null:
  ; result is undefined sentinel
```

For pointer-sized types (objects, strings), the null sentinel is the null pointer — no tag word is needed:

```llvm
; Nullable<*Object>: represented as a pointer, null = null pointer
%obj_ptr = alloca %Object*
; null check:
%is_null = icmp eq %Object* %obj_ptr, null
```

The compiler chooses the representation based on whether `T` is a value type or a reference type.

---

## Diagnostic codes

| Code | When emitted |
|------|--------------|
| SJS-E001 | `null` or `undefined` assigned to a non-nullable type `T` |
| SJS-E003 | Property or method access on `T?` without prior null narrowing |
| SJS-E011 | Non-null assertion operator `x!` used (banned in SJS) |
| SJS-W001 | Unannotated position inferred as `dynamic` in `--strict` mode |

---

## Examples

### Valid

```sjs
// Nullable variable with null check
let name: string? = null;
if (name !== null) {
  console.log(name.toUpperCase());  // name: string here
}

// Optional chaining
type User {
  address?: { city: string; };
}
function getCity(u: User): string | undefined {
  return u.address?.city;
}

// Nullish coalescing as fallback
function display(label: string?): string {
  return label ?? "(none)";
}

// Optional parameter
function greet(title?: string): string {
  if (title !== undefined) {
    return "Hello, " + title;
  }
  return "Hello";
}

// Chained optional access
type Config {
  server?: { host?: string; };
}
function getHost(cfg: Config): string | undefined {
  return cfg.server?.host;
}
```

### Invalid

```sjs
// SJS-E001: assigning null to non-nullable
let x: string = null;
//              ^^^^ SJS-E001: null is not assignable to string

// SJS-E001: returning null from non-nullable return type
function getName(): string {
  return null;  // SJS-E001
}

// SJS-E003: property access on nullable without narrowing
function printName(name: string?): void {
  console.log(name.toUpperCase());
  //          ^^^^ SJS-E003: name is string? — null-check required
}

// SJS-E011: non-null assertion operator (banned)
function unsafe(x: string?): string {
  return x!;  // SJS-E011: ! operator is not permitted in SJS
}

// SJS-E003: method call on nullable
type Node {
  getValue(): number;
}
function use(n: Node?): number {
  return n.getValue();  // SJS-E003: n may be null
}
```


# 002 — Sum Types

**Status:** Implemented (Stage 1 type-checker)
**Grammar:** `specs/grammar.ebnf` §TypeDecl, §SumTypeDef, §VariantDef

---

## Syntax

```ebnf
<TypeDecl>        ::= "type" <Identifier> [ <TypeParameters> ] "=" <SumTypeDef> ";"

<SumTypeDef>      ::= <VariantDef> { "|" <VariantDef> }

<VariantDef>      ::= <Identifier>
                    | <Identifier> "(" <Type> ")"
                    | <Identifier> "(" "{" <VariantFieldList> "}" ")"

<VariantFieldList> ::= <VariantField> { "," <VariantField> } [ "," ]

<VariantField>    ::= <Identifier> ":" <Type>

<TypeParameters>  ::= "<" <TypeParam> { "," <TypeParam> } ">"
<TypeParam>       ::= <Identifier>
```

The three `VariantDef` forms correspond to unit variants (no payload), tuple variants (single positional payload), and record variants (named-field payload). A sum type must have at least one variant.

---

## Semantics

### Nominal typing

Sum types are nominally typed. Two distinct `type` declarations with identical structure are not the same type:

```sjs
type A = Foo(number) | Bar(string);
type B = Foo(number) | Bar(string);  // A ≠ B even though structurally equal
```

Type identity is determined by the declaration, not the structure.

### Type parameters

Type parameters declared in `<TypeParameters>` are in scope across all variant definitions in the `SumTypeDef`. They are bound at instantiation:

```sjs
type Result<T, E> = Ok(T) | Err(E);
// T and E are bound when Result is used as Result<number, string>
```

### Variant constructors

Each variant name becomes a constructor in scope after the `type` declaration. Constructors are not first-class values — they must be applied in an expression context where the expected type is known or inferable.

- **Unit variant** — takes no arguments: `None`
- **Tuple variant** — takes a single expression as payload: `Ok(42)`
- **Record variant** — takes a block of named fields: `Node({ left: t1, right: t2 })`

### Variant names and scoping

Variant names are module-scoped identifiers. If two sum types in scope declare the same variant name, the compiler resolves ambiguity using the expected type context. If context is insufficient to disambiguate, SJS-E020 is emitted.

### Recursive types

Sum types may be self-referential via nullable or reference payloads:

```sjs
type Tree<T> = Leaf | Node({ value: T, left: Tree<T>?, right: Tree<T>? });
```

Direct non-nullable recursion without indirection is a compile error (infinite size).

---

## Runtime representation

Sum type values are represented as plain JavaScript objects with a mandatory `_tag` discriminant field. The tag value is the variant name as a string. This representation is canonical — all code generation and pattern matching relies on it.

### Unit variant

```
{ _tag: "VariantName" }
```

No payload field is present.

### Tuple variant

```
{ _tag: "VariantName", _0: <payload value> }
```

The payload is stored under the key `_0`. There is no `_1`, `_2`, etc. — tuple variants carry exactly one value. Multiple positional values require a record variant or a tuple type in the payload.

### Record variant

```
{ _tag: "VariantName", field1: <value>, field2: <value>, ... }
```

Each declared field name is used directly as a key. No `_0` is present.

### Examples

```
None            →  { _tag: "None" }
Ok(42)          →  { _tag: "Ok", _0: 42 }
Err("fail")     →  { _tag: "Err", _0: "fail" }
Node({ left: l, right: r })  →  { _tag: "Node", left: l, right: r }
```

---

## Type rules

### Unit variant construction

```
type D = ... | V | ...    (V is a unit variant of D)
──────────────────────────────────────────────────── (variant-unit)
Γ ⊢ V : D
```

### Tuple variant construction

```
type D<...> = ... | V(T) | ...    Γ ⊢ e : T[θ]    θ = type substitution
───────────────────────────────────────────────────────────────────────── (variant-tuple)
Γ ⊢ V(e) : D<...>[θ]
```

### Record variant construction

```
type D<...> = ... | V({ f1: T1, ..., fN: TN }) | ...
Γ ⊢ e1 : T1[θ], ..., Γ ⊢ eN : TN[θ]
──────────────────────────────────────────────────────── (variant-record)
Γ ⊢ V({ f1: e1, ..., fN: eN }) : D<...>[θ]
```

### Subtyping

Each variant is a subtype of its declaring sum type:

```
Γ ⊢ e : V_constructed_type     V declared in D
──────────────────────────────────────────────── (variant-sub)
Γ ⊢ e : D
```

### Type-directed disambiguation

When multiple sum types in scope share a variant name `V`, the compiler resolves using the expected type context:

```
expected type = D1    V declared in D1 and D2
────────────────────────────────────────────── (variant-disambig)
Γ ⊢ V(e) : D1
```

If no expected type context is available and the variant name is ambiguous, SJS-E020 is emitted.

---

## JS Lowering (Prototype)

Sum type declarations are erased. No constructor functions are generated. Each constructor expression is lowered to an object literal with `_tag` and payload fields inline.

```sjs
// SJS declarations
type Result<T, E> = Ok(T) | Err(E);
type Option<T> = Some(T) | None;
type Shape = Circle({ radius: number }) | Rect({ w: number, h: number }) | Point;
```

```javascript
// No JS output for declarations — erased entirely
```

```sjs
// SJS constructor expressions
const r1: Result<number, string> = Ok(42);
const r2: Result<number, string> = Err("not found");
const o: Option<number> = None;
const s: Shape = Circle({ radius: 5.0 });
```

```javascript
// JS output (types erased, constructors become object literals)
const r1 = { _tag: "Ok", _0: 42 };
const r2 = { _tag: "Err", _0: "not found" };
const o  = { _tag: "None" };
const s  = { _tag: "Circle", radius: 5.0 };
```

No helper functions, no prototype chains, no class instances. Constructors are syntactic sugar for object literal construction.

### Generic instantiation

Generic type parameters are erased. `Result<number, string>` and `Result<boolean, Error>` both lower to the same JS object shape — differentiation exists only at the type-checker level.

---

## LLVM Lowering (Future)

Sum types compile to tagged unions. The tag is an `i8` (supporting up to 255 variants). The payload is a byte array sized to the largest variant's payload. The compiler generates typed accessor functions for each variant.

```llvm
; type Shape = Circle(f64) | Rect({ w: f64, h: f64 }) | Point
; Tag assignments: Circle=0, Rect=1, Point=2

%Shape = type { i8, [16 x i8] }
;               ^^  ^^^^^^^^^^^
;              tag   payload (sized to largest variant = Rect: 2x f64 = 16 bytes)

; Constructing Circle(3.14):
%c = alloca %Shape
%tag_ptr = getelementptr %Shape, %Shape* %c, i32 0, i32 0
store i8 0, i8* %tag_ptr
%payload_ptr = getelementptr %Shape, %Shape* %c, i32 0, i32 1
%f64_ptr = bitcast [16 x i8]* %payload_ptr to double*
store double 3.14, double* %f64_ptr

; Constructing Point (unit — no payload write needed):
%p = alloca %Shape
%tag_ptr2 = getelementptr %Shape, %Shape* %p, i32 0, i32 0
store i8 2, i8* %tag_ptr2
```

For record variants with multiple fields, the payload is a packed struct cast to/from the byte array:

```llvm
; Rect payload struct
%RectPayload = type { double, double }   ; w, h

; Constructing Rect({ w: 4.0, h: 2.0 }):
%payload_ptr = getelementptr %Shape, %Shape* %r, i32 0, i32 1
%rect_ptr = bitcast [16 x i8]* %payload_ptr to %RectPayload*
store %RectPayload { double 4.0, double 2.0 }, %RectPayload* %rect_ptr
```

The compiler tracks tag-to-index mapping and generates a `__sjs_shape_tag` enum constant for each variant.

---

## Diagnostic codes

| Code | When emitted |
|------|--------------|
| SJS-E007 | Non-exhaustive `match` on a sum type (see `003-match.md`) |
| SJS-E020 | Ambiguous variant constructor: name shared by multiple sum types and context is insufficient |
| SJS-E010 | `enum` keyword used — SJS does not have C-style enums; use sum types |

---

## Examples

### Valid

```sjs
// Standard Result type
type Result<T, E> = Ok(T) | Err(E);

function divide(a: number, b: number): Result<number, string> {
  if (b === 0) {
    return Err("division by zero");
  }
  return Ok(a / b);
}

// Option type
type Option<T> = Some(T) | None;

function find(xs: number[], target: number): Option<number> {
  for (let i = 0; i < xs.length; i++) {
    if (xs[i] === target) {
      return Some(i);
    }
  }
  return None;
}

// Shape with unit, tuple, and record variants
type Shape = Circle(number) | Rect({ width: number, height: number }) | Point;

const c: Shape = Circle(5.0);
const r: Shape = Rect({ width: 10.0, height: 4.0 });
const p: Shape = Point;

// Recursive tree
type Tree<T> = Leaf | Node({ value: T, left: Tree<T>?, right: Tree<T>? });

const leaf: Tree<number> = Leaf;
const tree: Tree<number> = Node({ value: 1, left: null, right: null });

// Nested generic
type Validated<T> = Valid(T) | Invalid(string[]);

const v: Validated<number> = Valid(42);
const e: Validated<number> = Invalid(["too small", "must be even"]);
```

### Invalid

```sjs
// SJS-E020: ambiguous variant (both types declare Ok)
type A = Ok(number) | Fail;
type B = Ok(string) | Fail;

const x = Ok(1);  // SJS-E020: Ok is ambiguous between A and B

// Wrong payload type
type Result<T, E> = Ok(T) | Err(E);
const bad: Result<number, string> = Ok("hello");
//                                     ^^^^^^^ type error: expected number, got string

// SJS-E010: enum keyword not supported
enum Color { Red, Green, Blue }  // SJS-E010: use sum types instead

// Missing required record field
type Config = Settings({ host: string, port: number });
const cfg: Config = Settings({ host: "localhost" });
//                             ^^^ SJS-E002: missing field port
```


# 003 — Match Expressions

**Status:** Implemented (Stage 1 type-checker)
**Grammar:** `specs/grammar.ebnf` §MatchExpression, §MatchArm, §MatchPattern

---

## Syntax

```ebnf
<MatchExpression>  ::= "match" <Expression> "{" { <MatchArm> } "}"

<MatchArm>         ::= <MatchPattern> "=>" ( <Expression> | <BlockStatement> ) ","

<MatchPattern>     ::= <Identifier> "(" <Identifier> ")"
                     | <Identifier> "(" "{" <RecordPattern> "}" ")"
                     | <Identifier>
                     | "default"
                     | <Literal>

<RecordPattern>    ::= <RecordPatternField> { "," <RecordPatternField> } [ "," ]

<RecordPatternField> ::= <Identifier>
                       | <Identifier> ":" <Identifier>
```

The trailing comma on the last `<MatchArm>` is required by canonical style and enforced by the formatter. Arms are delimited by commas, not semicolons.

`<RecordPatternField>` without a colon shorthand (`{ left }`) binds the field to a variable of the same name. With a colon (`{ left: l }`) binds the field `left` to the variable `l`.

---

## Semantics

### match is an expression

`match` produces a value. It may appear in any position that accepts an expression: variable initializer, function argument, return statement, or operand of another expression. All arms must produce values of compatible types.

### Evaluation order

The subject expression is evaluated exactly once before any arm is tested. Arms are tested top-to-bottom. The body of the first matching arm is evaluated; subsequent arms are not evaluated. If no arm matches and no `default` arm is present, a runtime panic occurs (guarded by the exhaustiveness checker at compile time).

### Exhaustiveness

The compiler statically verifies that every variant of the matched sum type is covered by at least one arm. If any variant is uncovered and no `default` arm is present, SJS-E007 is emitted at the `match` expression.

The `default` arm suppresses exhaustiveness checking for the match expression — it matches any value not matched by a preceding arm. Adding new variants to a sum type after a `default`-using match does not trigger SJS-E007; the new variants fall through to `default`.

### Arm result type

All arm bodies must produce a type compatible with a common result type `T`. The result type of the `match` expression is the union of all arm body types after simplification. Arms with `BlockStatement` bodies must contain a final expression (value-producing block) or return.

### Pattern binding scope

Bindings introduced by a pattern (e.g., `Ok(v)`) are in scope only within the arm body for that arm. They shadow outer bindings of the same name for the duration of the arm body.

### Trailing comma

The trailing comma after the last arm is required. The parser treats missing trailing commas as a parse error.

---

## Pattern kinds

### 1. Tuple variant pattern: `V(binding)`

Matches a value whose `_tag` equals `"V"`. The inner value (`_0`) is bound to `binding` in the arm body.

```sjs
Ok(v) => v + 1,
```

`binding` must be a fresh identifier (not a pattern — nested patterns are not supported in this grammar version). The bound variable has the type declared as `V`'s payload type.

### 2. Record variant pattern: `V({ field, field: alias })`

Matches a value whose `_tag` equals `"V"`. Named fields are destructured. Each field may be bound to a same-name variable (`field`) or renamed (`field: alias`).

```sjs
Rect({ width, height }) => width * height,
Node({ value: v, left: l }) => v,
```

All declared fields of the variant need not be listed — omitted fields are not bound.

### 3. Unit variant pattern: `V`

Matches a value whose `_tag` equals `"V"` where `V` is a known unit variant of the matched type. No binding is introduced.

```sjs
None => 0,
Point => "origin",
```

### 4. Literal pattern: `<Literal>`

Matches a value equal (using `===`) to the literal. Valid for `number`, `string`, and `boolean` literals. Used when matching on primitive values rather than sum types.

```sjs
0   => "zero",
"ok" => true,
```

Literal patterns do not affect exhaustiveness checking for sum types. For primitive matches, exhaustiveness is not checked.

### 5. Binding pattern: bare `Identifier`

A bare identifier that does not match a known variant name in scope is treated as a binding pattern — it matches any value and binds it to the identifier. This has the same matching behavior as `default` but introduces a binding.

```sjs
other => log(other),
```

The compiler resolves whether an identifier is a variant or a binding at type-check time based on declared sum types in scope.

### 6. Wildcard: `default`

Matches any value. Introduces no binding. Suppresses exhaustiveness checking.

```sjs
default => fallback,
```

---

## Exhaustiveness algorithm

1. Determine the static type of the subject expression. If it is a sum type, collect the set of all declared variant names: `V = { V1, V2, ..., VN }`.
2. For each arm (in order), if the arm's pattern is a named variant pattern (unit, tuple, or record), add that variant to the covered set `C`.
3. If any arm's pattern is `default` or a binding pattern, mark the match as having a catch-all. No SJS-E007 is emitted.
4. After all arms: if `C ≠ V` and no catch-all is present, emit SJS-E007 listing `V \ C` (uncovered variants).
5. Separately, if an arm's pattern is a variant already in `C` at the time the arm is reached (covered by a prior arm), emit SJS-W003 (unreachable arm).

---

## Type rules

### Match expression type

```
Γ ⊢ e : D
patterns p1..pN cover all variants of D (or ∃ default arm)
Γ, bindings(p1) ⊢ e1 : T1
...
Γ, bindings(pN) ⊢ eN : TN
──────────────────────────────────────────────────────── (match-expr)
Γ ⊢ match e { p1 => e1, ..., pN => eN } : T1 | ... | TN
```

The result type is the union of all arm result types. The type-checker simplifies trivial unions (e.g., `string | string` → `string`).

### Bindings introduced by patterns

```
p = Ok(x)     variant Ok carries payload T
────────────────────────────────────────── (bind-tuple)
bindings(Ok(x)) = { x : T }

p = V({ f1, f2: g })     V carries { f1: T1, f2: T2, ... }
──────────────────────────────────────────────────────────── (bind-record)
bindings(p) = { f1 : T1, g : T2 }

p = V     V is unit variant
───────────────────────────── (bind-unit)
bindings(V) = {}

p = default
──────────────── (bind-default)
bindings(default) = {}

p = x     x is not a known variant
──────────────────────────────────── (bind-binding)
bindings(x) = { x : D }    where D is the matched type
```

### Non-exhaustive match

```
Γ ⊢ e : D     variants(D) = { V1, ..., VN }
covered arms = { V2, V3 }     V1 not covered     no default arm
─────────────────────────────────────────────── (non-exhaustive)
SJS-E007: match on D is not exhaustive; missing: V1
```

---

## JS Lowering (Prototype)

Each `match` expression is lowered to an immediately-invoked arrow function (IIFE). The subject is evaluated once into a `$m` temp. Each arm becomes an `if` testing `$m._tag`. Arm bodies return their expression value. A trailing `throw` guards against impossible non-exhaustive paths.

```sjs
// SJS input
const result: Result<number, string> = Ok(42);
const value = match result {
  Ok(v) => v * 2,
  Err(e) => -1,
};
```

```javascript
// JS output
const result = { _tag: "Ok", _0: 42 };
const value = (() => {
  const $m = result;
  if ($m._tag === "Ok") { const v = $m._0; return v * 2; }
  if ($m._tag === "Err") { const e = $m._0; return -1; }
  throw new Error("[SJS] Non-exhaustive match");
})();
```

### Record variant lowering

```sjs
match shape {
  Rect({ width, height }) => width * height,
  Circle(r) => 3.14159 * r * r,
  Point => 0.0,
};
```

```javascript
(() => {
  const $m = shape;
  if ($m._tag === "Rect") { const { width, height } = $m; return width * height; }
  if ($m._tag === "Circle") { const r = $m._0; return 3.14159 * r * r; }
  if ($m._tag === "Point") { return 0.0; }
  throw new Error("[SJS] Non-exhaustive match");
})()
```

### Literal pattern lowering

```sjs
match n {
  0 => "zero",
  1 => "one",
  default => "many",
};
```

```javascript
(() => {
  const $m = n;
  if ($m === 0) { return "zero"; }
  if ($m === 1) { return "one"; }
  return "many";
})()
```

`default` arms do not generate an `if` — they lower to a plain `return` at the end of the IIFE.

### Block body arms

```sjs
match x {
  Ok(v) => {
    const doubled = v * 2;
    doubled + 1
  },
  Err(e) => 0,
};
```

```javascript
(() => {
  const $m = x;
  if ($m._tag === "Ok") {
    const v = $m._0;
    const doubled = v * 2;
    return doubled + 1;
  }
  if ($m._tag === "Err") { const e = $m._0; return 0; }
  throw new Error("[SJS] Non-exhaustive match");
})()
```

The final expression in a block arm is lifted to a `return`.

---

## LLVM Lowering (Future)

Match compiles to a `switch` on the tag field of the sum type. Each arm becomes a labeled basic block. The `throw` for non-exhaustive paths becomes an `unreachable` instruction (valid because the type-checker guarantees exhaustiveness at compile time).

```llvm
; match result { Ok(v) => v * 2, Err(e) => -1 }
; Assume: Ok=tag 0, Err=tag 1

%tag = extractvalue %Result %result, 0
switch i8 %tag, label %unreachable [
  i8 0, label %arm_ok
  i8 1, label %arm_err
]

arm_ok:
  %payload_ptr = getelementptr %Result, %Result* %result_ptr, i32 0, i32 1
  %v_ptr = bitcast [8 x i8]* %payload_ptr to i64*
  %v = load i64, i64* %v_ptr
  %result_val = mul i64 %v, 2
  br label %match_exit

arm_err:
  ; e = _0 (string pointer, i8*)
  %e_ptr = getelementptr %Result, %Result* %result_ptr, i32 0, i32 1
  br label %match_exit

match_exit:
  %match_result = phi i64 [ %result_val, %arm_ok ], [ -1, %arm_err ]

unreachable:
  unreachable
```

For record variants, field extraction uses the `%VariantPayload` struct type via `bitcast` on the payload byte array.

---

## Diagnostic codes

| Code | When emitted |
|------|--------------|
| SJS-E007 | Match on a sum type is non-exhaustive: one or more variants are not covered and no `default` arm is present |
| SJS-W003 | Unreachable arm: a variant pattern is already covered by an earlier arm |

---

## Examples

### Valid: exhaustive match on `Result<T,E>`

```sjs
type Result<T, E> = Ok(T) | Err(E);

function unwrapOr(r: Result<number, string>, fallback: number): number {
  return match r {
    Ok(v) => v,
    Err(_e) => fallback,
  };
}
```

### Valid: match as expression in assignment

```sjs
type Color = Red | Green | Blue;

const hex: string = match color {
  Red   => "#FF0000",
  Green => "#00FF00",
  Blue  => "#0000FF",
};
```

### Valid: record variant destructuring

```sjs
type Shape = Circle(number) | Rect({ width: number, height: number }) | Point;

function area(s: Shape): number {
  return match s {
    Circle(r)            => 3.14159 * r * r,
    Rect({ width, height }) => width * height,
    Point                => 0.0,
  };
}
```

### Valid: record field renaming in pattern

```sjs
type Event = Click({ x: number, y: number }) | KeyPress({ key: string });

function describe(e: Event): string {
  return match e {
    Click({ x: cx, y: cy }) => "click at " + cx + "," + cy,
    KeyPress({ key: k })    => "key: " + k,
  };
}
```

### Valid: match on literal values

```sjs
function fizzbuzz(n: number): string {
  return match n % 15 {
    0  => "FizzBuzz",
    3  => "Fizz",
    5  => "Buzz",
    6  => "Fizz",
    9  => "Fizz",
    10 => "Buzz",
    12 => "Fizz",
    default => n.toString(),
  };
}
```

### Valid: binding pattern as catch-all

```sjs
type Msg = Quit | Move({ x: number, y: number }) | Write(string);

function handle(msg: Msg): string {
  return match msg {
    Quit         => "quit",
    other        => "unhandled: " + other._tag,
  };
}
```

### Valid: nested match

```sjs
type Option<T> = Some(T) | None;
type Result<T, E> = Ok(T) | Err(E);

function flatMap(r: Result<Option<number>, string>): number {
  return match r {
    Ok(opt) => match opt {
      Some(v) => v,
      None    => 0,
    },
    Err(_e) => -1,
  };
}
```

### Invalid: non-exhaustive match (SJS-E007)

```sjs
type Traffic = Red | Yellow | Green;

function act(t: Traffic): string {
  return match t {
    Red   => "stop",
    Green => "go",
    // SJS-E007: match on Traffic is not exhaustive; missing: Yellow
  };
}
```

### Invalid: unreachable arm (SJS-W003)

```sjs
type Option<T> = Some(T) | None;

const v = match opt {
  Some(x) => x,
  default => 0,
  None    => -1,  // SJS-W003: unreachable — default already covers None
};
```


# 004 — Dynamic Type

**Status:** Implemented (Stage 1 type-checker)
**Grammar:** `specs/grammar.ebnf` §PrimitiveType

---

## Syntax

`dynamic` is a reserved keyword in SJS and a member of the `<PrimitiveType>` production. It appears only in type positions; there is no `dynamic` expression form.

```ebnf
<PrimitiveType> ::= "number"
                  | "string"
                  | "boolean"
                  | "null"
                  | "undefined"
                  | "void"
                  | "never"
                  | "unknown"
                  | "dynamic"
```

Values acquire the type `dynamic` through explicit annotation (`let x: dynamic = ...`) or through inference when no annotation is present and the compiler cannot determine a more specific type (see Semantics §Implicit dynamic).

---

## Semantics

### Gradual typing

`dynamic` is the gradual type. It participates in the type system through a consistency relation rather than a subtyping relation. The notation `T ~ U` means "T is consistent with U".

`dynamic` is consistent with every type and every type is consistent with `dynamic`:

```
dynamic ~ T    for all T
T ~ dynamic    for all T
```

This is distinct from subtyping: `dynamic` is not a subtype of `T`, nor is `T` a subtype of `dynamic`. The consistency relation is symmetric but not transitive.

### Distinguished from `unknown`

`unknown` is the top type in SJS — every type is a subtype of `unknown`. Unlike `dynamic`, operating on an `unknown` value without narrowing is a compile error. `unknown` is safe by construction; `dynamic` delegates safety to the programmer.

| Property | `dynamic` | `unknown` |
|----------|-----------|-----------|
| Assignable from any type | Yes (consistency) | Yes (subtyping) |
| Assignable to any typed position | Yes (consistency) | No (must narrow) |
| Property access without narrowing | Yes (result: `dynamic`) | No (compile error) |
| Method call without narrowing | Yes (result: `dynamic`) | No (compile error) |
| Arithmetic without narrowing | Yes (result: `dynamic`) | No (compile error) |

### Distinguished from banned `any`

TypeScript's `any` is banned in SJS. The keyword `any` is a reserved word that triggers SJS-E004. The conceptual role of `any` in TypeScript is filled by `dynamic` in SJS, with two differences:

1. `dynamic` emits SJS-W001 in `--strict` mode when implicit, making gradual typing visible.
2. In the LLVM backend (Phase 3), `dynamic` carries a runtime type tag, enabling safe dispatch.

### Propagation

Operations on `dynamic` values propagate the type:

- Property access: `e.prop` where `e: dynamic` → type is `dynamic`
- Method call: `e.method(args)` where `e: dynamic` → type is `dynamic`
- Element access: `e[k]` where `e: dynamic` → type is `dynamic`
- Function call: `e(args)` where `e: dynamic` → type is `dynamic`
- Arithmetic: `e + x` where `e: dynamic` → type is `dynamic`

This ensures that the `dynamic` boundary does not silently stop propagating — values derived from a `dynamic` source remain `dynamic` until an explicit type annotation or narrowing is applied.

### Implicit dynamic

When a declaration position has no type annotation and inference cannot determine a specific type, the position is implicitly typed as `dynamic`.

- **Phase 1 (current):** Implicit `dynamic` is silently accepted. No diagnostic.
- **Phase 2 (`--strict`):** Implicit `dynamic` emits SJS-W001 on the unannotated position.
- **Phase 3 (LLVM target):** Implicit `dynamic` in fully-typed positions is a compile error; annotation is required.

### Appropriate use cases

`dynamic` is appropriate at boundaries where the type is genuinely unknown at compile time:

1. **JS interop:** Calling a third-party library that has no `.d.sjs` declaration file.
2. **JSON deserialization:** The result of `JSON.parse(s)` is `dynamic` until narrowed.
3. **Incremental migration:** Translating plain JavaScript to SJS; `dynamic` is a placeholder to be removed as types are added.

`dynamic` is NOT appropriate as a substitute for:

- Not knowing the type → use `unknown` with narrowing
- Multiple possible types → use a union type `A | B`
- A reusable container of unknown type → use a type parameter `<T>`

### Narrowing `dynamic`

A `dynamic` value can be narrowed using type guards before use in a type-safe position:

```sjs
let val: dynamic = getFromCache();

if (typeof val === "string") {
  // val: string in this branch
  console.log(val.toUpperCase());
}
```

After narrowing, the value is treated as the narrowed type. This is the recommended pattern for operating on `dynamic` values safely.

---

## Type rules

### Consistency rules

```
──────────────────── (dyn-top)
dynamic ~ T

──────────────────── (dyn-bottom)
T ~ dynamic
```

Consistency is symmetric but not transitive. `int ~ dynamic` and `dynamic ~ string` does NOT imply `int ~ string`.

### Assignment via consistency

```
Γ ⊢ e : dynamic     target type is T
──────────────────────────────────────── (dyn-assign-to-typed)
Γ ⊢ e assignable to T     (warning SJS-W002 in strict mode)

Γ ⊢ e : T     target type is dynamic
──────────────────────────────────────── (dyn-assign-from-typed)
Γ ⊢ e assignable to dynamic
```

### Property access propagation

```
Γ ⊢ e : dynamic
────────────────────────── (dyn-prop)
Γ ⊢ e.prop : dynamic
```

### Call propagation

```
Γ ⊢ e : dynamic
────────────────────────────────────── (dyn-call)
Γ ⊢ e(a1, ..., aN) : dynamic
```

### Arithmetic propagation

```
Γ ⊢ e1 : dynamic      Γ ⊢ e2 : T
──────────────────────────────────── (dyn-arith-left)
Γ ⊢ e1 op e2 : dynamic

Γ ⊢ e1 : T      Γ ⊢ e2 : dynamic
──────────────────────────────────── (dyn-arith-right)
Γ ⊢ e1 op e2 : dynamic
```

### Narrowing

```
Γ ⊢ e : dynamic
typeof e === "string" in branch B
──────────────────────────────────────── (dyn-narrow-typeof)
Γ|B ⊢ e : string
```

Narrowing applies to: `typeof`, `instanceof`, and discriminant checks. After narrowing, the value is treated as the narrowed type within the scope of the narrowed branch.

---

## JS Lowering (Prototype)

`dynamic` is erased entirely at compile time. No runtime representation is generated, no wrapper is emitted, and no type tag is attached to the value. A value of type `dynamic` is passed through the JS output as-is.

```sjs
// SJS input
function parseConfig(raw: dynamic): string {
  return raw.name;
}
```

```javascript
// JS output — dynamic erased, no wrappers
function parseConfig(raw) {
  return raw.name;
}
```

Implicit dynamic positions similarly produce no annotation in the output:

```sjs
// SJS input (implicit dynamic in non-strict mode)
function identity(x) {
  return x;
}
```

```javascript
// JS output — unchanged
function identity(x) {
  return x;
}
```

---

## LLVM Lowering (Future)

In the LLVM backend (Phase 3), `dynamic` values carry a runtime type tag. The tag enables safe dispatch for operations on dynamic values.

```llvm
; Dynamic value representation
%Dynamic = type { i8, %DynamicPayload }
%DynamicPayload = type { [8 x i8] }

; Tag encoding:
; 0 = number (f64)
; 1 = string (i8*)
; 2 = boolean (i1)
; 3 = null
; 4 = undefined
; 5 = object (%SJSObject*)
; 6 = array (%SJSArray*)
```

### Runtime dispatch for property access

Property access on a `dynamic` value dispatches through a runtime library function:

```llvm
; e.prop where e: dynamic
; Calls: __sjs_dynamic_prop(%Dynamic %e, i8* prop_name)
%prop_name = getelementptr [5 x i8], [5 x i8]* @.str.name, i32 0, i32 0
%result = call %Dynamic @__sjs_dynamic_prop(%Dynamic %e, i8* %prop_name)
```

### Runtime dispatch for arithmetic

```llvm
; e1 + e2 where e1: dynamic
; Calls: __sjs_dynamic_add(%Dynamic %e1, %Dynamic %e2)
%result = call %Dynamic @__sjs_dynamic_add(%Dynamic %e1, %Dynamic %e2)
```

The runtime library implements `__sjs_dynamic_add`, `__sjs_dynamic_prop`, `__sjs_dynamic_call`, etc. Each function inspects the tag and dispatches accordingly, mimicking JavaScript semantics for dynamic values.

---

## `dynamic` vs `unknown` vs `any` comparison

| Property | `dynamic` (SJS) | `unknown` (SJS) | `any` (TypeScript, banned in SJS) |
|---|---|---|---|
| Assignable from any type | Yes (consistency) | Yes (subtyping) | Yes |
| Assignable to any typed position | Yes (consistency) | No — must narrow first | Yes |
| Property access without narrowing | Yes — result is `dynamic` | No — compile error | Yes |
| Method call without narrowing | Yes — result is `dynamic` | No — compile error | Yes |
| Arithmetic without narrowing | Yes — result is `dynamic` | No — compile error | Yes |
| Implicit (unannotated) | Yes, with SJS-W001 in strict | Not implicit | Yes (was implicit in TS) |
| LLVM backend | Tagged union with runtime dispatch | Requires narrowing before LLVM use | N/A — banned |
| When to use | Interop boundaries, JSON, migration | "I will narrow before use" | Never — use `dynamic` |

---

## Diagnostic codes

| Code | When emitted |
|------|--------------|
| SJS-E004 | The keyword `any` appears in a type position (banned; message suggests `dynamic`) |
| SJS-W001 | An unannotated position is inferred as `dynamic` in `--strict` mode |
| SJS-W002 | A `dynamic` value is assigned to a typed position without narrowing in `--strict` mode |

---

## Examples

### Valid: interop boundary

```sjs
// Third-party library with no .d.sjs declarations
declare function loadPlugin(name: string): dynamic;

const plugin: dynamic = loadPlugin("chart-lib");
const version: dynamic = plugin.version;  // dynamic.prop → dynamic
const chart = plugin.create({ width: 400, height: 300 });  // dynamic.call → dynamic
```

### Valid: JSON parsing

```sjs
function parseUser(json: string): dynamic {
  return JSON.parse(json);  // JSON.parse returns dynamic
}

const raw: dynamic = parseUser('{"name":"Alice","age":30}');
// Access fields via dynamic — compiler trusts the programmer
const name: dynamic = raw.name;
```

### Valid: narrowing dynamic before use

```sjs
function processValue(val: dynamic): string {
  if (typeof val === "string") {
    // val: string in this branch
    return val.toUpperCase();
  }
  if (typeof val === "number") {
    // val: number in this branch
    return val.toFixed(2);
  }
  return String(val);
}
```

### Valid: incremental migration pattern

```sjs
// Phase 1: migrating from JS — dynamic is a temporary placeholder
function legacyTransform(input: dynamic): dynamic {
  const result: dynamic = input.data;
  return { processed: true, value: result };
}

// Phase 2 (target): replace dynamic with real types
function legacyTransform(input: { data: number }): { processed: boolean, value: number } {
  return { processed: true, value: input.data };
}
```

### Valid: explicit dynamic annotation (suppresses SJS-W001)

```sjs
// Explicit annotation: programmer has acknowledged dynamic use
let cache: dynamic = null;

function setCache(val: dynamic): void {
  cache = val;
}
```

### Invalid: using `any` (SJS-E004)

```sjs
// SJS-E004: `any` is banned in SJS
function process(x: any): any {
//                  ^^^  ^^^ SJS-E004: `any` is not a valid SJS type; use `dynamic`
  return x;
}
```

### Warning: implicit dynamic in strict mode (SJS-W001)

```sjs
// With --strict flag:
function add(a, b) {
//           ^  ^ SJS-W001: parameter a has no type annotation; inferred as dynamic
//              ^ SJS-W001: parameter b has no type annotation; inferred as dynamic
  return a + b;
}
```

### Warning: dynamic assigned to typed position (SJS-W002, strict mode)

```sjs
// With --strict flag:
function extract(data: dynamic): string {
  const name: string = data.name;
  //                   ^^^^^^^^^ SJS-W002: dynamic value assigned to string without narrowing
  return name;
}

// Fix: narrow first
function extract(data: dynamic): string {
  const raw: dynamic = data.name;
  if (typeof raw !== "string") {
    throw new Error("name must be a string");
  }
  return raw;  // raw: string here — no SJS-W002
}
```

### Invalid: using `dynamic` where a type parameter is appropriate

```sjs
// Incorrect: loses type information
function identity(x: dynamic): dynamic {
  return x;
}

// Correct: use a type parameter to preserve the relationship
function identity<T>(x: T): T {
  return x;
}
```


# 005 — Generics

**Status:** Implemented (Stage 1 type-checker)
**Grammar:** `specs/grammar.ebnf` §TypeParameters, §TypeArguments, §GenericFunction, §GenericClass

---

## Syntax

```ebnf
<TypeParameters>   ::= "<" <TypeParameter> { "," <TypeParameter> } ">"
<TypeParameter>    ::= <Identifier> [ "=" <Type> ]
                       (* default type param; NO "extends" constraint — banned in SJS *)

<TypeArguments>    ::= "<" <TypeArgumentList> ">"
<TypeArgumentList> ::= <Type> { "," <Type> }

<GenericFunction>  ::= "function" <Identifier> <TypeParameters>
                       "(" [ <ParameterList> ] ")" ":" <Type>
                       <Block>

<GenericClass>     ::= "class" <Identifier> <TypeParameters>
                       [ "extends" <TypeRef> [ <TypeArguments> ] ]
                       [ "implements" <TypeRef> { "," <TypeRef> } ]
                       "{" { <ClassMember> } "}"

<GenericType>      ::= "type" <Identifier> <TypeParameters>
                       [ "extends" <TypeRef> { "," <TypeRef> } ]
                       "{" { <TypeMember> } "}"

<GenericTypeAlias> ::= "type" <Identifier> <TypeParameters> "=" <Type> ";"
```

Type parameter names are conventionally single uppercase letters (`T`, `U`, `K`, `V`) but any valid identifier is accepted.

---

## Semantics

### Scope of type parameters

Type parameters are scoped to the declaration that introduces them. A type parameter `T` introduced on a function is bound for the duration of that function's parameter list, return type, and body. On a class, `T` is bound for all instance members (but not static members, which must introduce their own parameters if needed). On a `type` declaration (either brace form or alias form), `T` is bound within the body.

```sjs
function identity<T>(x: T): T { return x }   // T bound here only
class Box<T> { value: T }                     // T bound to instance scope
type Pair<A, B> { first: A; second: B }       // A, B bound in body
type Result<T> = { ok: true; value: T } | { ok: false; error: string }
```

### No `T extends U` constraints

SJS bans `T extends U` type constraints entirely. This rule exists because:

1. Constraint checking requires subtype decidability that conflicts with the SJS native compiler.
2. Constraints are typically needed only because the type system lacks another mechanism; in SJS, structural object types handle the common case.
3. Monomorphization generates one concrete function per instantiation; the compiler can verify structural compatibility at each call site without a general constraint mechanism.

See the "Constraints workaround" section below for the recommended patterns.

Attempting to use `T extends U` emits **SJS-E008**.

### Default type parameters

A type parameter may carry a default: `<T = string>`. When the generic is instantiated without providing an explicit argument for `T`, and the compiler cannot infer `T` from the call-site arguments, `T` resolves to the default type.

```sjs
type Box<T = string> = { value: T }

const a: Box = { value: "hello" }   // T defaults to string
const b: Box<number> = { value: 42 } // T explicitly number
```

Defaults are evaluated left-to-right. A later parameter may reference an earlier one as its default:

```sjs
type Keyed<K = string, V = K> = { key: K; value: V }
```

### Instantiation: explicit and inferred

Generic functions may be called with explicit type arguments or with arguments inferred from the value parameters:

```sjs
identity<number>(42)        // explicit instantiation
identity("hello")           // T inferred as string from argument
```

Inference is performed by unifying the types of actual arguments against the parameter types. If unification succeeds and all type parameters are resolved, explicit type arguments are not required. If unification is ambiguous or a type parameter appears only in the return type (not in any value parameter), an explicit type argument is required.

### Variance

All generic type parameters are **invariant** in v1. No `in`/`out` variance annotations exist. This means `Box<Cat>` is not assignable to `Box<Animal>` even if `Cat <: Animal`. Variance annotations are planned for a future version.

### Constraints workaround

Since `T extends Type` is banned, the recommended patterns for constraining generic behaviour are:

**Pattern 1 — Accept the object type directly (most common):**
```sjs
// Instead of: function process<T extends Serializable>(x: T): string
type Serializable { serialize(): string }
function process(x: Serializable): string { return x.serialize() }
```

**Pattern 2 — Accept `dynamic` and narrow at runtime:**
```sjs
function process(x: dynamic): string {
  if (typeof x.serialize === "function") {
    return x.serialize()
  }
  throw new Error("Not serializable")
}
```

**Pattern 3 — Use separate typed overloads for a finite set of types:**
```sjs
function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x))
}
function clampBigInt(x: bigint, lo: bigint, hi: bigint): bigint {
  return lo > x ? lo : hi < x ? hi : x
}
```

---

## Type rules

### Generic introduction (function)

```
Γ, T ⊢ body : U    (T is fresh in Γ)
───────────────────────────────────────── (gen-intro-fn)
Γ ⊢ function f<T>(x: T): U
```

A generic function is well-typed if its body type-checks under an environment that includes the fresh type variable `T`.

### Generic elimination (explicit)

```
Γ ⊢ f : <T> (T → U)    Γ ⊢ arg : A
──────────────────────────────────── (gen-elim-explicit)
Γ ⊢ f<A>(arg) : [A/T]U
```

Explicit type application substitutes `A` for `T` throughout the result type.

### Generic elimination (inferred)

```
Γ ⊢ f : <T> (T → U)    Γ ⊢ arg : A    unify(T, A) = [A/T]
──────────────────────────────────────────────────────────── (gen-elim-infer)
Γ ⊢ f(arg) : [A/T]U    (T inferred as A)
```

### Default type parameter

```
Γ ⊢ Box<T = D>    no argument for T provided    unify(T) fails
──────────────────────────────────────────────────────────────── (gen-default)
T resolves to D
```

---

## JS Lowering (Prototype)

Generics are **fully erased** in the Babel-based JS output. Type parameters and type arguments exist only at the type-check level; they produce no runtime code.

```sjs
// SJS input
function identity<T>(x: T): T {
  return x
}

const n = identity<number>(42)
const s = identity("hello")
```

```javascript
// JS output
function identity(x) {
  return x;
}

const n = identity(42);
const s = identity("hello");
```

Generic class example:

```sjs
// SJS input
class Stack<T> {
  private items: T[] = []

  push(item: T): void {
    this.items.push(item)
  }

  pop(): T? {
    return this.items.pop() ?? null
  }

  get size(): number {
    return this.items.length
  }
}
```

```javascript
// JS output
class Stack {
  items = [];

  push(item) {
    this.items.push(item);
  }

  pop() {
    return this.items.pop() ?? null;
  }

  get size() {
    return this.items.length;
  }
}
```

Type arguments in calls are stripped before code generation:

```sjs
// SJS input
const box: Box<number> = { value: 42 }
```

```javascript
// JS output
const box = { value: 42 };
```

---

## LLVM Lowering (Future)

The LLVM backend uses **monomorphization** — each unique instantiation of a generic produces a fully separate compiled function or struct. The compiler maintains a monomorphization table; duplicate instantiations (same generic + same type arguments) are deduplicated to a single definition.

This approach is mandatory because types affect memory layout. `Stack<number>` allocates 64-bit slots; `Stack<string>` allocates pointer-sized slots. Type erasure cannot be used safely with a native memory model.

```llvm
; function identity<T>(x: T): T
; Monomorphized for T = f64 (number):
define double @identity_number(double %x) {
entry:
  ret double %x
}

; Monomorphized for T = %SjsString (string):
define %SjsString @identity_string(%SjsString %x) {
entry:
  ret %SjsString %x
}
```

Generic struct monomorphization:

```llvm
; class Stack<T> — monomorphized for T = f64
%Stack_number = type {
  %SjsArray_number* ; items: number[]
}

; Stack<number>.push:
define void @Stack_number_push(%Stack_number* %self, double %item) {
  ; call SjsArray_number_push on %self->items
  ...
}
```

Template instantiation occurs at the call site. The compiler:
1. Resolves all type arguments (explicit or inferred).
2. Looks up the monomorphization table for an existing definition.
3. If not found, instantiates the generic body with concrete types and compiles it.
4. Emits a direct `call` to the monomorphized function.

---

## Diagnostic codes

| Code | When emitted |
|------|-------------|
| `SJS-E008` | `T extends U` used as a type constraint (banned in SJS) |
| `SJS-E006` | Indexed access type `T['key']` used inside a generic body or constraint |
| Parse error | `<` without matching `>` in type parameter list |
| Type error | Type argument count does not match type parameter count |
| Type error | Type argument cannot be inferred and no explicit argument provided |

---

## Examples

### Valid

```sjs
// ✓ Generic identity function
function identity<T>(x: T): T {
  return x
}
const a = identity<number>(42)       // explicit
const b = identity("hello")          // inferred: T = string

// ✓ Generic Stack class
class Stack<T> {
  private items: T[] = []

  push(item: T): void { this.items.push(item) }

  pop(): T? {
    if (this.items.length === 0) return null
    return this.items.pop()!  // internal use after length check
  }

  peek(): T? {
    return this.items[this.items.length - 1] ?? null
  }
}

const stack = new Stack<number>()
stack.push(1)
stack.push(2)
const top: number? = stack.pop()

// ✓ Generic type alias (Result type)
type Result<T> = { ok: true; value: T } | { ok: false; error: string }

function divide(a: number, b: number): Result<number> {
  if (b === 0) return { ok: false, error: "division by zero" }
  return { ok: true, value: a / b }
}

// ✓ Generic Pair type alias
type Pair<A, B> = { first: A; second: B }

const coords: Pair<number, number> = { first: 3, second: 4 }
const entry: Pair<string, boolean> = { first: "active", second: true }

// ✓ Default type parameter
type Box<T = string> = { value: T }

const strBox: Box = { value: "hello" }     // T defaults to string
const numBox: Box<number> = { value: 99 }  // T explicitly number

// ✓ Type inference from arguments
function wrap<T>(value: T): { wrapped: T } {
  return { wrapped: value }
}
const w1 = wrap(true)         // inferred: T = boolean
const w2 = wrap<string>("x")  // explicit: T = string

// ✓ Generic object type (`type` brace form)
type Container<T> {
  value: T
  map<U>(fn: (x: T) => U): Container<U>
}
```

### Invalid

```sjs
// ✗ SJS-E008: T extends U constraint (banned)
function getLength<T extends { length: number }>(x: T): number {
  //                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ SJS-E008
  return x.length
}

// ✗ SJS-E008: extends in class type parameter
class Repository<T extends Entity> {
  //               ^^^^^^^^^^^^^^^ SJS-E008
}

// ✗ SJS-E006: indexed access type in generic
type ValueOf<T> = T['value']
//                ^^^^^^^^^ SJS-E006: indexed access type not permitted

// ✗ Type error: wrong number of type arguments
type Pair<A, B> = { first: A; second: B }
const bad: Pair<string> = { first: "x", second: "y" }
//         ^^^^^^^^^^^^ Error: Pair requires 2 type arguments, got 1
```


# 006 — Object Types (`type` brace form)

**Status:** Implemented (Stage 1 type-checker)
**Grammar:** `specs/grammar.ebnf` §TypeDecl, §ObjectTypeDecl, §InterfaceMember

---

## Syntax

SuperJS has a single declaration keyword, `type`, with two forms. The **brace / object form** described here declares a named structural object type — the role that the `interface` keyword used to fill. (The `interface` keyword has been removed; using it is a parse error, `SJS-P001`.) The other form is the **alias form** `type X = …`, covered under "Object form vs alias form" below.

The brace form has **no `=`**: the optional `extends` clause and the member body follow the name directly.

```ebnf
<TypeDecl>        ::= <ObjectTypeDecl>
                    | <TypeAliasDecl>

<ObjectTypeDecl>  ::= "type" <Identifier>
                      [ <TypeParameters> ]
                      [ "extends" <TypeRef> { "," <TypeRef> } ]
                      "{" { <InterfaceMember> } "}"

<TypeAliasDecl>   ::= "type" <Identifier>
                      [ <TypeParameters> ]
                      "=" <Type>

<InterfaceMember> ::= <InterfaceProperty>
                    | <InterfaceMethod>
                    | <IndexSignature>

<InterfaceProperty> ::= [ "readonly" ] <Identifier> [ "?" ] ":" <Type> ";"

<InterfaceMethod>   ::= <Identifier>
                        [ <TypeParameters> ]
                        "(" [ <ParameterList> ] ")"
                        ":" <Type>
                        ";"

<IndexSignature>    ::= "[" <Identifier> ":" <PrimitiveType> "]" ":" <Type> ";"
```

`<PrimitiveType>` in an index signature is restricted to `string` or `number`. Symbol index signatures are not supported in v1.

---

## Semantics

### Structural typing — Go-style conformance

SJS uses **structural typing** for object types. A value satisfies an object type if it provides all required members with compatible types. There is no `implements` keyword; conformance is checked implicitly at every use site where the object type is expected.

The type name is a type annotation only. It has no runtime representation, generates no code, and cannot appear as an expression.

```sjs
type Drawable {
  draw(): void
}

class Circle {             // no "implements Drawable"
  radius: number
  constructor(r: number) { this.radius = r }
  draw(): void { /* renders circle */ }
}

function render(d: Drawable): void {
  d.draw()
}

render(new Circle(5))      // ✓ — Circle structurally satisfies Drawable
```

The compiler checks, at the call `render(new Circle(5))`, that `Circle` provides all members of `Drawable`. It does. Conformance is confirmed; no annotation on `Circle` is required or expected.

### Required vs optional members

A member without `?` is **required**. Every value of the object type must provide this member.

A member with `?` is **optional**. The property may be absent. When absent, accessing it yields `undefined`. When present, its type is `T` (the declared type, narrowed). Inside the body of a function or block that has narrowed the member to be present, its type is `T`.

```sjs
type Config {
  host: string        // required
  port?: number       // optional — number | undefined
  tls?: boolean       // optional
}
```

### `readonly` members

A `readonly` property cannot be reassigned after the object is constructed. This is a **type-level constraint only** — the JS output does not use `Object.defineProperty` or freeze; it is not enforced at runtime.

```sjs
type Point {
  readonly x: number
  readonly y: number
}

function translate(p: Point, dx: number, dy: number): Point {
  // p.x = p.x + dx   // ✗ — cannot assign to readonly property
  return { x: p.x + dx, y: p.y + dy }  // ✓ — new object
}
```

### Index signatures

An index signature `[key: string]: T` declares that all string-keyed properties on the object have type `T`. Named properties in the same object type must also be assignable to `T` when an index signature is present.

```sjs
type StringMap {
  [key: string]: string
}

type Headers {
  [key: string]: string
  "content-type": string   // ✓ — string is compatible with index value type
}
```

### Object type extension

An object type may `extend` one or more other object types. The extended type inherits all members from each parent. If two parents declare the same member name, the types must be identical; otherwise a compile-time error is emitted. Note the brace form takes no `=` — the `extends` clause and body follow the name directly.

```sjs
type Shape {
  area(): number
}

type Colored {
  color: string
}

type ColoredShape extends Shape, Colored {
  // has: area(): number, color: string
  label?: string   // additional member
}
```

### Object form vs alias form

The two forms of `type` serve different purposes:

| | Object form (`type X { … }`) | Alias form (`type X = …`) |
|---|---|---|
| Composes other types | Yes (`extends A, B`) | No (use union) |
| Can be satisfied by a class | Yes (structural) | Only if the alias is itself an object type |
| Can name a primitive | No | Yes (`type Id = string`) |
| Can name a union / sum type | No | Yes (`type Result<T,E> = Ok(T) \| Err(E)`) |
| Declaration merging | Planned (v2) | Not supported |

The object form is preferred for objects and classes. The alias form is preferred for unions, sum types, primitive wrappers, and utility types.

### Generic object types

The object form may carry type parameters. See `005-generics.md` for the full rules. Generic object types follow the same structural conformance rules — a value satisfies a generic instantiation if it provides all members with types compatible with the instantiated form.

```sjs
type Container<T> {
  value: T
  transform<U>(fn: (x: T) => U): Container<U>
}
```

### No `implements` keyword

SJS does not support `implements`. Classes do not declare which object types they satisfy. Adding `implements` to a class declaration is a **parse error**.

The rationale: structural typing makes `implements` redundant. All conformance checking occurs at use sites. This reduces boilerplate and decouples class definitions from the object types they happen to satisfy.

---

## Type rules

### Structural satisfaction

```
type I { m1: T1; m2: T2; ... }
Γ ⊢ e : { m1: S1; m2: S2; ...; mN: SN; ... }
S1 <: T1    S2 <: T2    ...
─────────────────────────────────────────────── (structural-satisfy)
Γ ⊢ e : I
```

A value satisfies `I` if it structurally provides every required member with a compatible type. Additional members are permitted (width subtyping).

### Optional member access

```
type I { p?: T }
Γ ⊢ e : I
────────────────────────────────── (optional-access)
Γ ⊢ e.p : T | undefined
```

### Readonly enforcement

```
type I { readonly p: T }
Γ ⊢ e : I
────────────────────────────────── (readonly-write-fail)
Γ ⊢ (e.p = v) : SJS-E002   (* assignment to readonly property *)
```

### Object type extension (subtype)

```
type J extends I
Γ ⊢ e : J
────────────────────── (extends-sub)
Γ ⊢ e : I
```

A value of type `J` is assignable to `I` if `J extends I`, because `J` is guaranteed to carry all of `I`'s members.

### Structural subtype widening

```
Γ ⊢ e : { a: A; b: B }
───────────────────────── (width-sub)
Γ ⊢ e : { a: A }
```

Objects with more members are assignable to object types with fewer members (open-world structural subtyping).

---

## JS Lowering (Prototype)

Object types are **erased entirely**. No runtime representation is generated. No `implements` check occurs. The compiled JS relies on duck typing — if the object has the right properties, it works.

```sjs
// SJS input
type Serializable {
  serialize(): string
}

function encode(s: Serializable): string {
  return s.serialize()
}

class User {
  name: string
  constructor(n: string) { this.name = n }
  serialize(): string { return JSON.stringify({ name: this.name }) }
}

encode(new User("Alice"))
```

```javascript
// JS output — type Serializable is gone
function encode(s) {
  return s.serialize();
}

class User {
  name;
  constructor(n) { this.name = n; }
  serialize() { return JSON.stringify({ name: this.name }); }
}

encode(new User("Alice"));
```

`readonly` modifiers are erased. They exist only in the type-checker. The JS property is writable at runtime.

> Note: in JS lowering, "interface" below refers to the AST node for an object-type declaration (internally `ObjectTypeDecl`). The member nodes are `InterfaceProperty` / `InterfaceMethod`.

---

## LLVM Lowering (Future)

Object-type conformance is verified statically by the type-checker. No vtable is generated in v1. At the LLVM level, a call through an object type is resolved to a **direct function call** after monomorphization — the compiler knows the concrete type at every call site.

```llvm
; render(d: Drawable) called with a Circle
; Compiler resolves: Circle.draw() is @Circle_draw
call void @Circle_draw(%Circle* %d)
```

Post-1.0 (polymorphic dispatch): when the concrete type cannot be determined statically (e.g., a heterogeneous collection), the compiler will emit a vtable pointer in the struct and indirect call:

```llvm
; Future: vtable-based dispatch (not v1)
%vtable_ptr = getelementptr %Drawable, %Drawable* %d, i32 0, i32 0
%draw_fn = load void (%Drawable*)*, void (%Drawable*)** %vtable_ptr
call void %draw_fn(%Drawable* %d)
```

`readonly` fields: the LLVM backend may place `readonly` object-type properties in read-only data segments and elide stores.

---

## Diagnostic codes

| Code | When emitted |
|------|-------------|
| `SJS-P001` | `interface` keyword used (removed — use the `type` brace form) |
| `SJS-E002` | Value assigned to an object type is missing a required member |
| `SJS-E002` | Assignment to a `readonly` property |
| `SJS-E005` | `A & B` intersection type used where object-type extension should be used (`type X extends A, B { … }`) |
| Parse error | `implements` keyword on a class declaration (not supported in SJS) |
| Type error | Object-type extension conflict: same member name with incompatible types |
| Type error | Index signature value type incompatible with a named property type |

---

## Examples

### Valid

```sjs
// ✓ Basic object type and structural conformance
type Printable {
  print(): void
}

class Document {
  content: string
  constructor(c: string) { this.content = c }
  print(): void { console.log(this.content) }
}

function output(p: Printable): void { p.print() }
output(new Document("hello"))    // ✓ structural match

// ✓ Object literal satisfying an object type
type Point { x: number; y: number }
const origin: Point = { x: 0, y: 0 }

// ✓ Optional and readonly members
type Config {
  readonly apiUrl: string
  timeout?: number
  retries?: number
}

const cfg: Config = { apiUrl: "https://api.example.com" }
const t: number | undefined = cfg.timeout

// ✓ Object-type extension (multiple)
type Shape { area(): number }
type Colored { color: string }
type Labeled { label: string }

type TaggedShape extends Shape, Colored, Labeled {
  tag: string
}

// ✓ Index signature
type Registry {
  [key: string]: string
}
const r: Registry = {}
r["foo"] = "bar"

// ✓ Generic object type
type Container<T> {
  value: T
  isEmpty(): boolean
}

class Maybe<T> {
  value: T?
  constructor(v: T?) { this.value = v }
  isEmpty(): boolean { return this.value === null }
}

function use<T>(c: Container<T>): void {
  if (!c.isEmpty()) {
    console.log(c.value)
  }
}

// ✓ Class satisfying an object type — no "implements" needed
type Comparable {
  compareTo(other: Comparable): number
}

class Temperature {
  celsius: number
  constructor(c: number) { this.celsius = c }
  compareTo(other: Temperature): number {
    return this.celsius - other.celsius
  }
}

function sort(items: Comparable[]): Comparable[] {
  return items.slice().sort((a, b) => a.compareTo(b))
}
```

### Invalid

```sjs
// ✗ SJS-E002: missing required member
type Animal {
  name: string
  speak(): string
}

const cat: Animal = { name: "Whiskers" }
//  ^^^  SJS-E002: property 'speak' is missing — Animal requires speak(): string

// ✗ SJS-E002: assigning to readonly property
type Immutable { readonly id: number }
function mutate(x: Immutable): void {
  x.id = 99   // SJS-E002: cannot assign to readonly property 'id'
}

// ✗ SJS-E005: intersection type instead of object-type extension
type Both = Shape & Colored
//               ^ SJS-E005: intersection types are not permitted in SJS
//   Use: type Both extends Shape, Colored {}

// ✗ SJS-P001: the 'interface' keyword has been removed
interface Drawable { draw(): void }
//  ^^^^^^^^^  SJS-P001: 'interface' is not a keyword — use: type Drawable { draw(): void }

// ✗ Parse error: implements keyword
type Runnable { run(): void }

class Task implements Runnable {   // Parse error: 'implements' is not supported in SJS
  run(): void { /* ... */ }        // Structural conformance is automatic — remove 'implements'
}
```


# 007 — Banned TypeScript Features

**Status:** Implemented (Stage 1 parser + type-checker)
**Grammar:** `specs/grammar.ebnf` §BannedConstructs

---

## Overview

SJS is a strict subset of TypeScript's value language combined with a simplified, decidable type system. Several TypeScript type-system features are **banned** in SJS because they are:

- Undecidable or Turing-complete (conditional types, mapped types, `infer`)
- Unsafe escape hatches (`any`, `!` non-null assertion)
- Non-ECMAScript constructs with runtime overhead (`enum`, `namespace`)
- Incompatible with monomorphization and static memory layout (intersections, indexed access, `typeof` in type position)

This document is the normative reference for all banned constructs. Each section gives: what the construct is, why it is banned, the error code, the SJS alternative, and before/after examples.

The compiler emits the relevant diagnostic code and **halts code generation** for any file containing a banned construct. No partial JS output is produced.

---

## Syntax

Banned constructs are rejected at two stages:

1. **Parse time** — constructs with no valid parse in SJS grammar (angle-bracket cast, `namespace`, `enum`).
2. **Type-check time** — constructs that parse as valid expressions/types but are rejected by the type rules (`any`, `!`, intersections, conditional types, mapped types, `infer`, indexed access, `typeof` in type position).

---

## Semantics

Each banned feature is documented below. All are rejected unconditionally — there is no pragma, flag, or escape hatch to allow them.

---

### 1. `any` type → SJS-E004

**Description:** TypeScript's `any` type disables all type checking for a value. A value of type `any` is assignable to every type and every type is assignable to `any`.

**Why banned:** `any` is an invisible hole in the type system. It spreads silently — a function returning `any` contaminates every downstream variable. In a language targeting a native LLVM backend, `any` provides no memory layout information, making code generation impossible. Even in the JS prototype, `any` defeats the purpose of type checking.

**Error code:** `SJS-E004`

**SJS alternative:** Use `unknown` when the type is genuinely unknown (requires explicit narrowing before use) or `dynamic` when interfacing with untyped external code (tracked and warns in strict mode).

```sjs
// ✗ Before (TypeScript with any):
function parse(raw: any): any {
  return JSON.parse(raw)
}

// ✓ After (SJS with unknown):
function parse(raw: string): unknown {
  return JSON.parse(raw)
}
function useResult(x: unknown): string {
  if (typeof x === "string") return x   // narrowed to string
  return String(x)
}

// ✓ After (SJS with dynamic for external interop):
function fromExternal(x: dynamic): string {
  return String(x)
}
```

---

### 2. `!` non-null assertion operator → SJS-E011

**Description:** The postfix `x!` operator strips `null` and `undefined` from the type of `x` without performing any runtime check. It is a pure compile-time assertion.

**Why banned:** The assertion is unverifiable — the programmer is lying to the type checker. If `x` is actually `null` at runtime, the program proceeds with a null value typed as non-null, causing unpredictable failures downstream. This defeats null safety, which is a core SJS invariant (see `001-null-safety.md`).

**Error code:** `SJS-E011`

**SJS alternative:** Use an explicit null check, optional chaining `?.`, nullish coalescing `??`, or an early return/throw guard.

```sjs
// ✗ Before:
function getLength(s: string?): number {
  return s!.length   // SJS-E011
}

// ✓ After — null check:
function getLength(s: string?): number {
  if (s === null) return 0
  return s.length   // narrowed to string
}

// ✓ After — nullish coalescing:
function getLength(s: string?): number {
  return (s ?? "").length
}

// ✓ After — optional chaining with fallback:
function getLength(s: string?): number {
  return s?.length ?? 0
}
```

---

### 3. `enum` → SJS-E010

**Description:** TypeScript `enum` is a dual-valued construct that creates both a type and a runtime object. Numeric enums also generate a reverse mapping (`Direction[0] === "Up"`).

**Why banned:** `enum` is not an ECMAScript construct — it compiles to a self-executing function that creates a mutable object. It is not tree-shakeable, generates unexpected runtime overhead, and its numeric/string duality is a common source of bugs. The reverse mapping creates an unexpectedly large runtime artifact. SJS targets both JS and native LLVM; `enum` has no sensible LLVM representation.

**Error code:** `SJS-E010`

**SJS alternative:** String literal union types for exhaustive sets of named values; sum types with unit variants for discriminated unions.

```sjs
// ✗ Before (TypeScript enum):
enum Direction { Up, Down, Left, Right }
function move(d: Direction): void { /* ... */ }
move(Direction.Up)

// ✓ After (SJS string literal union):
type Direction = "Up" | "Down" | "Left" | "Right"
function move(d: Direction): void { /* ... */ }
move("Up")

// ✗ Before (TypeScript string enum):
enum Status { Active = "ACTIVE", Inactive = "INACTIVE" }

// ✓ After (SJS type alias + named constants):
type Status = "ACTIVE" | "INACTIVE"
const Status = {
  Active: "ACTIVE" as Status,
  Inactive: "INACTIVE" as Status,
}

// ✓ After (SJS sum type — discriminated union):
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "rect"; width: number; height: number }
```

---

### 4. `A & B` intersection types → SJS-E005

**Description:** TypeScript intersection types produce a type that is simultaneously `A` and `B`. A value of type `A & B` satisfies both `A` and `B`.

**Why banned:** Intersection types can produce unverifiable or unsound merged shapes — for example, `{ x: string } & { x: number }` produces `{ x: never }`, which no value can satisfy. More fundamentally, intersections create anonymous merged types with no named declaration, which cannot be assigned a stable memory layout for LLVM code generation. They also interact badly with generic monomorphization.

**Error code:** `SJS-E005`

**SJS alternative:** Object type extension (`type C extends A, B {}`) for named combined types. Named object types give the compiler a stable, declared layout.

```sjs
// ✗ Before (TypeScript intersection):
type ColoredShape = Shape & Colored
function render(cs: Shape & Colored): void { /* ... */ }

// ✓ After (SJS object type extension):
type Shape { area(): number }
type Colored { color: string }
type ColoredShape extends Shape, Colored {}
function render(cs: ColoredShape): void { /* ... */ }

// ✗ Before (inline intersection in function param):
function process(x: { id: number } & { name: string }): void { /* ... */ }

// ✓ After (named object type):
type Entity { id: number; name: string }
function process(x: Entity): void { /* ... */ }
```

---

### 5. `T extends U ? A : B` conditional types → SJS-E008

**Description:** TypeScript conditional types express type-level if-then-else: "if `T` extends `U`, the type is `A`; otherwise `B`."

**Why banned:** Conditional types make the type system Turing-complete. General type-level computation is undecidable; the TypeScript compiler uses heuristics and depth limits to avoid infinite loops. SJS targets a decidable type system that can be compiled by a native compiler in a single pass without approximation. Additionally, the `T extends U` form in a generic constraint position (`<T extends U>`) is also banned for the same reason (see section 5 and `005-generics.md`).

**Error code:** `SJS-E008`

**SJS alternative:** Explicit function overloads; union return types; separate named functions for distinct cases.

```sjs
// ✗ Before (TypeScript conditional type):
type Flatten<T> = T extends Array<infer U> ? U : T

// ✓ After (SJS — separate explicit types):
type FlatNumber = number
type FlatString = string
// Or: accept the array and return the element:
function flattenNumbers(xs: number[]): number[] { return xs.flat() }

// ✗ Before (conditional return type):
function process<T>(x: T): T extends string ? string[] : number

// ✓ After (SJS — separate overloaded functions):
function processString(x: string): string[] { return x.split("") }
function processNumber(x: number): number { return x * 2 }
```

---

### 6. `{ [K in keyof T]: ... }` mapped types → SJS-E006

**Description:** TypeScript mapped types generate a new type by iterating over the keys of another type: `{ [K in keyof T]: T[K] | null }`.

**Why banned:** Mapped types require the compiler to enumerate the keys of a type at type-check time, which requires tracking all property names as first-class type-level values. This is incompatible with static struct layout determination for LLVM. A mapped type produces an anonymous, derived type with no stable identity — it cannot be monomorphized.

**Error code:** `SJS-E006`

**SJS alternative:** Declare the target type explicitly with named members. For utility-type use cases, write the transformed object type by hand or use a generator script.

```sjs
// ✗ Before (TypeScript mapped type):
type Partial<T> = { [K in keyof T]?: T[K] }
type Readonly<T> = { readonly [K in keyof T]: T[K] }

// ✓ After (SJS — explicit object type):
type PartialUser {
  name?: string
  email?: string
  age?: number
}

type ReadonlyPoint {
  readonly x: number
  readonly y: number
}

// ✗ Before (mapped type with template):
type Nullable<T> = { [K in keyof T]: T[K] | null }

// ✓ After (SJS — explicitly written out):
type NullableUser {
  name: string?
  email: string?
  age: number?
}
```

---

### 7. `infer` keyword → SJS-E009

**Description:** The `infer` keyword appears exclusively inside conditional types: `T extends Array<infer U> ? U : never`. It binds a fresh type variable by pattern-matching the structure of another type.

**Why banned:** `infer` only exists in the context of conditional types, which are banned (see section 5). It makes type inference undecidable in the general case. No use of `infer` is valid in SJS.

**Error code:** `SJS-E009`

**SJS alternative:** Explicit type annotations; generic type parameters on functions and object types.

```sjs
// ✗ Before (TypeScript infer):
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never
type ElementType<T> = T extends Array<infer E> ? E : never

// ✓ After (SJS — annotate explicitly or use a generic parameter):
// Just annotate the return type directly:
function getUser(): User { /* ... */ }   // return type is explicitly User

// For extracting element type, accept the array and type the element:
function first<T>(xs: T[]): T? {
  return xs.length > 0 ? xs[0] : null
}
```

---

### 8. `T['key']` indexed access types → SJS-E006

**Description:** TypeScript indexed access types extract the type of a property at a given string key: `User['name']` produces the type of `name` on `User`.

**Why banned:** Indexed access creates a dependent type — a type that depends on a runtime string value. While the key is often a literal, the general mechanism allows runtime string variables as keys, making the type of `T[K]` undecidable without full evaluation. Even the literal-key form is banned in SJS for consistency and because it enables composition with mapped types and `keyof`, both of which are banned.

**Error code:** `SJS-E006`

**SJS alternative:** Define a named type alias for the property type.

```sjs
// ✗ Before (TypeScript indexed access):
type UserName = User['name']
type ConfigValue = Config['server']['port']

// ✓ After (SJS — explicit type alias):
type UserName = string   // the type of User.name

type ServerConfig { port: number; host: string }
type Config { server: ServerConfig }
type ConfigPort = number   // the type of Config.server.port
```

---

### 9. `namespace` → SJS-E012

**Description:** TypeScript `namespace` (formerly `module`) is a TypeScript-specific module system predating ES modules. It wraps declarations in a named scope.

**Why banned:** `namespace` has no ECMAScript equivalent. It compiles to an IIFE that mutates a shared object — a pattern that cannot be represented in ES modules or LLVM. It conflicts with the ES module system that SJS uses (`import`/`export`). Using `namespace` in new code is an anti-pattern even in TypeScript.

**Error code:** `SJS-E012`

**SJS alternative:** ES module `import`/`export`. Each file is a module. Use barrel files (`index.sjs`) for re-exporting grouped APIs.

```sjs
// ✗ Before (TypeScript namespace):
namespace Geometry {
  export type Point { x: number; y: number }
  export function distance(a: Point, b: Point): number {
    return Math.hypot(a.x - b.x, a.y - b.y)
  }
}
const d = Geometry.distance({ x: 0, y: 0 }, { x: 3, y: 4 })

// ✓ After (SJS ES modules):
// geometry.sjs
export type Point { x: number; y: number }
export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

// consumer.sjs
import { distance, Point } from "./geometry.sjs"
const d = distance({ x: 0, y: 0 }, { x: 3, y: 4 })
```

---

### 10. `typeof x` in type position → SJS-E006

**Description:** TypeScript allows `typeof expr` in a type annotation to infer the type of a value: `let y: typeof x = ...`. This captures the inferred type of any expression as a type.

**Why banned:** `typeof expr` in type position makes the type of `y` depend on the inferred shape of `x`, coupling type identities to value shapes. This is a form of structural inference bypass that interferes with forward declarations and declaration-order independence. It also allows `typeof` to produce complex anonymous types (equivalent to mapped types or conditional results), both of which are banned.

**Error code:** `SJS-E006`

**SJS alternative:** Declare an explicit type alias and annotate both variables.

```sjs
// ✗ Before (TypeScript typeof in type position):
const config = { host: "localhost", port: 3000 }
type Config = typeof config   // SJS-E006

function update(cfg: typeof config): void { /* ... */ }   // SJS-E006

// ✓ After (SJS — explicit object type):
type Config { host: string; port: number }
const config: Config = { host: "localhost", port: 3000 }
function update(cfg: Config): void { /* ... */ }
```

---

### 11. `<T>expr` angle-bracket type cast → Parse error

**Description:** TypeScript supports two cast syntaxes: `<string>value` (angle-bracket) and `value as string` (keyword form). SJS bans the angle-bracket form.

**Why banned:** Angle-bracket casts are ambiguous with JSX syntax: `<string>` can be a JSX element or a type cast depending on context. Rather than require a JSX flag, SJS bans the angle-bracket form universally and requires `as` instead.

**Error code:** Parse error (no SJS error code; rejected by the parser)

**SJS alternative:** Use `value as Type`.

```sjs
// ✗ Before (TypeScript angle-bracket cast):
const s = <string>someValue    // Parse error in SJS

// ✓ After (SJS as-cast):
const s = someValue as string
```

Note: `as` casts are themselves restricted in SJS. Casting to an incompatible type emits a type warning. Safe narrowing is preferred over unsafe casting.

---

### 12. `==` / `!=` abstract equality → SJS-L003 (lint warning)

**Description:** JavaScript's `==` and `!=` operators perform type coercion before comparison: `1 == "1"` is `true`; `null == undefined` is `true`.

**Classification:** This is a **lint warning** (`SJS-L003`), not a hard type error. Code using `==`/`!=` is still compiled; a warning is emitted. In `--strict` mode, this warning is promoted to an error.

**Why linted:** Coercion-based equality is a persistent source of bugs. `null == undefined` being true means that null checks using `==` silently pass for both values. The coercion rules are complex and non-obvious.

**SJS alternative:** Use strict equality `===` and `!==`. For null/undefined checks that should match both, use the `??` operator or an explicit `x === null || x === undefined` guard.

```sjs
// ✗ Linted (SJS-L003):
if (x == null) { /* ... */ }    // matches null AND undefined (surprising)
if (count == "0") { /* ... */ } // type coercion: string "0" to number

// ✓ Preferred:
if (x === null || x === undefined) { /* ... */ }   // explicit
if (x === null) { /* ... */ }   // if only null is intended
if (count === 0) { /* ... */ }  // strict type equality
```

---

## JS Lowering (Prototype)

All banned features are rejected at parse or type-check time. The Babel-based compiler emits the diagnostic code and **does not produce JS output** for files containing banned constructs. There is no partial compilation.

```
// Any file containing a banned construct:
// → Parse/type error emitted
// → Compilation halted
// → No .js file written
// → Exit code 1
```

Tooling (language server, `--watch` mode) marks the offending range with the error code and continues processing other files.

---

## LLVM Lowering (Future)

Same policy — banned features never reach the LLVM backend. The type-checker runs before code generation; a file with any banned construct is rejected before IR emission begins.

---

## Diagnostic codes

| Code | Feature | Stage |
|------|---------|-------|
| `SJS-E004` | `any` type | Type-check |
| `SJS-E005` | `A & B` intersection type | Type-check |
| `SJS-E006` | Mapped type, indexed access `T['k']`, `typeof` in type position | Type-check |
| `SJS-E008` | Conditional type `T extends U ? A : B`; `T extends U` constraint | Type-check |
| `SJS-E009` | `infer` keyword | Type-check |
| `SJS-E010` | `enum` declaration | Parse |
| `SJS-E011` | `!` non-null assertion | Parse/Type-check |
| `SJS-E012` | `namespace` declaration | Parse |
| Parse error | `<T>expr` angle-bracket cast | Parse |
| `SJS-L003` | `==` / `!=` abstract equality | Lint |

---

## Examples

### Valid (SJS alternatives)

```sjs
// ✓ unknown instead of any
function safeParse(s: string): unknown {
  return JSON.parse(s)
}

// ✓ null check instead of !
function greet(name: string?): string {
  if (name === null) return "Hello"
  return "Hello, " + name
}

// ✓ string literal union instead of enum
type Color = "red" | "green" | "blue"
function paint(c: Color): void { /* ... */ }
paint("red")

// ✓ object type extension instead of intersection
type Named { name: string }
type Aged { age: number }
type Person extends Named, Aged {}

// ✓ ES module instead of namespace
// shapes.sjs
export type Circle { radius: number }
export function circleArea(c: Circle): number { return Math.PI * c.radius ** 2 }
```

### Invalid

```sjs
// ✗ SJS-E004: any
let x: any = 42          // SJS-E004

// ✗ SJS-E011: non-null assertion
const name: string = user.name!   // SJS-E011

// ✗ SJS-E010: enum
enum Status { Active, Inactive }   // SJS-E010

// ✗ SJS-E005: intersection type
type Both = A & B   // SJS-E005

// ✗ SJS-E008: conditional type
type IsString<T> = T extends string ? true : false   // SJS-E008

// ✗ SJS-E006: mapped type
type Partial<T> = { [K in keyof T]?: T[K] }   // SJS-E006

// ✗ SJS-E009: infer
type Elem<T> = T extends Array<infer E> ? E : never   // SJS-E009

// ✗ SJS-E006: indexed access
type N = User['name']   // SJS-E006

// ✗ SJS-E012: namespace
namespace Utils { export function id(x: number): number { return x } }   // SJS-E012

// ✗ SJS-E006: typeof in type position
type T = typeof someValue   // SJS-E006

// ✗ Parse error: angle-bracket cast
const s = <string>rawValue   // Parse error — use: rawValue as string

// ✗ SJS-L003: abstract equality (lint warning)
if (value == null) { /* ... */ }   // SJS-L003
```


# 008 — Access Modifiers

**Status:** Implemented (Stage 1 type-checker)
**Grammar:** `specs/grammar.ebnf` §AccessModifier, §ClassProperty, §ClassMethod, §ClassConstructor

---

## Syntax

```ebnf
<AccessModifier>   ::= "public" | "private" | "protected"

<ClassProperty>    ::= [ <AccessModifier> ] [ "static" ] [ "readonly" ] [ "abstract" ]
                       <Identifier> [ "?" ] [ ":" <Type> ] [ "=" <Expression> ] ";"

<ClassMethod>      ::= [ <AccessModifier> ] [ "static" ] [ "abstract" ] [ "async" ]
                       [ "get" | "set" | "*" ]
                       <Identifier>
                       [ <TypeParameters> ]
                       "(" [ <ParameterList> ] ")"
                       ":" <Type>
                       ( <Block> | ";" )

<ClassConstructor> ::= [ <AccessModifier> ] "constructor"
                       "(" [ <ConstructorParameterList> ] ")"
                       <Block>

<ConstructorParameterList> ::= <ConstructorParameter> { "," <ConstructorParameter> }
<ConstructorParameter>     ::= [ <AccessModifier> ] <Parameter>
                               (* parameter with access modifier → parameter property *)
```

Modifiers must appear in the order shown above. For example, `public static readonly x` is valid; `static public x` is a parse error.

---

## Semantics

### The three access levels

#### `public` (default)

A `public` member is accessible from any scope: within the class body, in subclasses, and from external code. `public` is the default — if no access modifier is written, the member is public. Writing `public` explicitly is redundant but permitted; the compiler emits a lint warning `SJS-W005`.

```sjs
class Logger {
  public level: string = "info"     // explicit public — redundant, allowed
  message: string = ""              // implicit public — identical effect
  public log(msg: string): void { console.log(msg) }
}

const l = new Logger()
l.level = "debug"    // ✓ — public
l.message = "hi"     // ✓ — public (implicit)
```

#### `private`

A `private` member is accessible **only within the declaring class body** — specifically, only through `this.member` expressions inside methods or property initializers of that class. Access from outside the class body, even through an instance variable of the correct type, is a type error.

`private` is **type-level enforcement only** in the JS output. The compiled JS does not use `#field` (hard-private) syntax. The JS runtime does not enforce access restrictions; external code could access private members at runtime if TypeScript-style soft privacy is acceptable. For runtime privacy, use `#field` syntax (see section below).

```sjs
class Counter {
  private count: number = 0

  increment(): void {
    this.count++           // ✓ — within class body
  }

  value(): number {
    return this.count      // ✓ — within class body
  }
}

const c = new Counter()
c.increment()
// c.count = 5           // ✗ SJS-E014 — private outside class body
```

#### `protected`

A `protected` member is accessible within the declaring class body **and** within any subclass body. It is not accessible from outside the class hierarchy.

```sjs
class Animal {
  protected name: string

  constructor(name: string) {
    this.name = name
  }

  protected describe(): string {
    return `I am ${this.name}`
  }
}

class Dog extends Animal {
  bark(): string {
    return this.describe() + " and I bark"   // ✓ — subclass access
  }
}

const d = new Dog("Rex")
// d.name                // ✗ SJS-E014 — protected, not in hierarchy
// d.describe()          // ✗ SJS-E014 — protected, not in hierarchy
```

### Scope of application

Access modifiers apply to:

| Target | Supported |
|--------|-----------|
| Instance properties | Yes |
| Static properties | Yes |
| Instance methods | Yes |
| Static methods | Yes |
| Constructors | Yes (controls instantiation visibility) |
| Constructor parameter properties | Yes (declares and assigns) |
| Getters and setters | Yes |

### Constructor parameter property shorthand

When a constructor parameter is prefixed with an access modifier, the compiler treats it as a **parameter property declaration**. It automatically:
1. Declares the property on the class with the given modifier and type.
2. Assigns `this.propName = paramName` at the start of the constructor body.

This is syntactic sugar — no semantic difference from declaring the property separately.

```sjs
// Shorthand:
class Point {
  constructor(public x: number, public y: number) {}
}

// Equivalent expansion:
class Point {
  public x: number
  public y: number
  constructor(x: number, y: number) {
    this.x = x
    this.y = y
  }
}
```

The shorthand is valid with `public`, `private`, and `protected`. `readonly` may also be combined:

```sjs
class Config {
  constructor(
    public readonly host: string,
    private readonly port: number,
    protected timeout: number = 5000
  ) {}
}
```

### `static` + access modifier

`static` and access modifiers are orthogonal. A `static private` member is private to the class but shared across all instances. A `static protected` member is accessible in static methods of the class and its subclasses.

```sjs
class IdGenerator {
  private static nextId: number = 0

  static generate(): number {
    return IdGenerator.nextId++    // ✓ — static private, within class
  }
}
```

### Method override and access widening

When a subclass overrides an inherited method, the access modifier must be **equal or wider** (more permissive) than the parent's modifier:

- `protected` override of `protected` → ✓ (same)
- `public` override of `protected` → ✓ (widening: more accessible)
- `protected` override of `public` → ✗ `SJS-E015` (narrowing: less accessible)
- `private` override of `private` → each class has its own private copy; not a true override

This rule ensures that code using the base class type can always access the member through the declared interface.

```sjs
class Base {
  protected greet(): string { return "Hello" }
}

class Child extends Base {
  public greet(): string { return "Hi!" }   // ✓ — widened to public
}

class Bad extends Base {
  // protected greet() is fine, but narrowing public to protected is banned:
}

class BasePublic {
  public announce(): void { console.log("Base") }
}

class NarrowedChild extends BasePublic {
  protected announce(): void { console.log("Child") }
  // ✗ SJS-E015 — narrowing public to protected
}
```

### `#field` vs `private` modifier

SJS supports both:

| | `private` modifier | `#field` (ES2022) |
|---|---|---|
| Enforcement | Type-level only | Runtime (hard private) |
| JS output | Property without prefix | Property with `#` prefix |
| Accessible via `Object.keys` | Yes (soft private) | No (hard private) |
| Recommended for | TypeScript migration | New code requiring runtime privacy |
| Syntax | `private x: T` | `#x: T` |

```sjs
class SafeBox {
  #secret: string             // hard private — runtime enforced
  private softSecret: string  // soft private — type-level only

  constructor(s: string, ss: string) {
    this.#secret = s
    this.softSecret = ss
  }
}
```

`#field` declarations do not carry an access modifier keyword — the `#` prefix itself denotes privacy. Mixing `private #field` is a parse error.

### Abstract members

`abstract` methods may carry `protected` or `public` but not `private` (abstract methods must be accessible by subclasses to be overridable):

```sjs
abstract class Shape {
  abstract area(): number             // implicitly public
  protected abstract describe(): string   // protected abstract — valid
  // private abstract draw(): void    // ✗ — private abstract not allowed
}
```

---

## Type rules

### Public access (anywhere)

```
Γ ⊢ e : C    member m of C has modifier public
────────────────────────────────────────────── (access-public)
Γ ⊢ e.m : T_m
```

### Private access (within class only)

```
Γ ⊢ this : C    member m of C has modifier private
─────────────────────────────────────────────────── (access-private-ok)
Γ ⊢ this.m : T_m

Γ ⊢ e : C    (e is not `this` or e is not within C's body)
member m of C has modifier private
─────────────────────────────────────────────────────────── (access-private-fail)
SJS-E014: private member 'm' is not accessible outside class C
```

### Protected access (class and subclasses)

```
Γ ⊢ this : D    D extends C (directly or transitively)
member m of C has modifier protected
──────────────────────────────────────────────────────── (access-protected-ok)
Γ ⊢ this.m : T_m

Γ ⊢ e : C    e is not `this` in C or a subclass of C
member m of C has modifier protected
──────────────────────────────────────────────────────── (access-protected-fail)
SJS-E014: protected member 'm' is not accessible outside class hierarchy
```

### Override access widening

```
C has method m with modifier Mc
D extends C, D declares override of m with modifier Md
Md is at least as permissive as Mc   (public ≥ protected ≥ private)
────────────────────────────────────────────────────── (override-access-ok)
Override is valid

Md is strictly less permissive than Mc
────────────────────────────────────────────────────── (override-access-fail)
SJS-E015: override of 'm' narrows access from Mc to Md
```

---

## JS Lowering (Prototype)

Access modifiers are **erased** in the JS output. The compiled JS uses plain class syntax without access prefix. No `#field` syntax is generated for `private` modifier (only for explicit `#field` declarations). Runtime access is unrestricted.

```sjs
// SJS input
class Counter {
  private count: number = 0

  public increment(): void {
    this.count++
  }

  public value(): number {
    return this.count
  }
}
```

```javascript
// JS output — access modifiers erased
class Counter {
  count = 0;

  increment() {
    this.count++;
  }

  value() {
    return this.count;
  }
}
```

Constructor parameter property shorthand is expanded:

```sjs
// SJS input
class Point {
  constructor(public x: number, private y: number) {}
}
```

```javascript
// JS output
class Point {
  x;
  y;
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}
```

`#field` declarations are preserved in JS output (they are valid ES2022):

```sjs
// SJS input
class Vault {
  #secret: string = ""
  set(s: string): void { this.#secret = s }
  get(): string { return this.#secret }
}
```

```javascript
// JS output
class Vault {
  #secret = "";
  set(s) { this.#secret = s; }
  get() { return this.#secret; }
}
```

---

## LLVM Lowering (Future)

At the LLVM level, access modifiers affect **linkage and symbol visibility**, not the memory layout of structs.

**`public` fields and methods:**
- Instance fields: accessible via struct offset; offset exported in the type descriptor.
- Methods: external linkage; callable from any translation unit.

**`private` fields and methods:**
- Instance fields: allocated in the struct; offset is not exported. Only the class's own methods have the offset constant.
- Methods: internal linkage (`define internal`); not callable from outside the translation unit.

**`protected` fields and methods:**
- Instance fields: offset exported to subclass translation units only (via a protected symbol).
- Methods: linkage restricted to the class hierarchy.

```llvm
; public method — external linkage
define double @Counter_value(%Counter* %self) {
  %count_ptr = getelementptr %Counter, %Counter* %self, i32 0, i32 0
  %count = load double, double* %count_ptr
  ret double %count
}

; private method — internal linkage
define internal void @Counter_increment(%Counter* %self) {
  %count_ptr = getelementptr %Counter, %Counter* %self, i32 0, i32 0
  %count = load double, double* %count_ptr
  %new = fadd double %count, 1.0
  store double %new, double* %count_ptr
  ret void
}
```

**`static` fields:** allocated once in the global data section, not per-instance. Access modifier determines the symbol's linkage.

```llvm
; static private field — internal linkage global
@IdGenerator_nextId = internal global double 0.0
```

---

## Diagnostic codes

| Code | When emitted |
|------|-------------|
| `SJS-E014` | Access to `private` member from outside the declaring class body |
| `SJS-E014` | Access to `protected` member from outside the class hierarchy |
| `SJS-E015` | Override of an inherited method narrows the access modifier |
| `SJS-W005` | Explicit `public` modifier used (redundant; `public` is the default) |
| Parse error | `private abstract` method (private abstract is not allowed) |
| Parse error | `private #field` (combining `private` keyword with `#` syntax) |
| Parse error | Access modifier on a parameter that is not a constructor parameter |

---

## Examples

### Valid

```sjs
// ✓ Basic public / private / protected
class BankAccount {
  protected balance: number

  constructor(initialBalance: number) {
    this.balance = initialBalance
  }

  public deposit(amount: number): void {
    if (amount > 0) this.balance += amount
  }

  private validate(amount: number): boolean {
    return amount > 0 && amount <= this.balance
  }

  public withdraw(amount: number): boolean {
    if (!this.validate(amount)) return false
    this.balance -= amount
    return true
  }

  public getBalance(): number {
    return this.balance
  }
}

// ✓ Constructor parameter property shorthand
class Vector2D {
  constructor(
    public readonly x: number,
    public readonly y: number
  ) {}

  magnitude(): number {
    return Math.hypot(this.x, this.y)
  }
}

const v = new Vector2D(3, 4)
console.log(v.x)           // ✓ public
console.log(v.magnitude()) // ✓ public method
// v.x = 10               // ✗ SJS-E002 — readonly

// ✓ Static + private
class Sequence {
  private static next: number = 0

  static generate(): number {
    return Sequence.next++
  }

  private id: number

  constructor() {
    this.id = Sequence.generate()
  }

  getId(): number {
    return this.id
  }
}

// ✓ Protected in subclass
class Vehicle {
  protected speed: number = 0
  protected maxSpeed: number

  constructor(max: number) {
    this.maxSpeed = max
  }

  protected accelerate(delta: number): void {
    this.speed = Math.min(this.speed + delta, this.maxSpeed)
  }
}

class Car extends Vehicle {
  constructor() { super(200) }

  floorIt(): void {
    this.accelerate(50)        // ✓ — protected in subclass
    this.accelerate(50)
    this.accelerate(50)
    console.log(this.speed)   // ✓ — protected property in subclass
  }
}

// ✓ Abstract + protected
abstract class Formatter {
  protected abstract format(value: unknown): string

  public print(value: unknown): void {
    console.log(this.format(value))
  }
}

class JsonFormatter extends Formatter {
  protected format(value: unknown): string {
    return JSON.stringify(value)
  }
}

// ✓ #field (hard private) vs private modifier (soft private)
class Token {
  #raw: string                // hard private — runtime enforced
  private cached: string?     // soft private — type-level only

  constructor(raw: string) {
    this.#raw = raw
    this.cached = null
  }

  toString(): string {
    if (this.cached === null) {
      this.cached = Buffer.from(this.#raw).toString("base64")
    }
    return this.cached
  }
}
```

### Invalid

```sjs
// ✗ SJS-E014: accessing private member from outside class
class Secret {
  private data: string = "hidden"
}

const s = new Secret()
console.log(s.data)    // SJS-E014: 'data' is private to class Secret

// ✗ SJS-E014: accessing protected member from non-subclass
class Base {
  protected value: number = 42
}

class Unrelated {
  read(b: Base): number {
    return b.value   // SJS-E014: 'value' is protected — only accessible in Base subclasses
  }
}

// ✗ SJS-E015: narrowing access on override
class Parent {
  public announce(): void { console.log("Parent") }
}

class Child extends Parent {
  protected announce(): void { console.log("Child") }
  // SJS-E015: override of 'announce' narrows access from public to protected
}

// ✗ SJS-W005: redundant explicit public (lint warning)
class Verbose {
  public name: string = ""              // SJS-W005: 'public' is the default
  public greet(): void { /* ... */ }    // SJS-W005
}

// ✗ Parse error: private abstract
abstract class Bad {
  private abstract compute(): number   // Parse error: private abstract not allowed
}

// ✗ Parse error: private #field combination
class Clash {
  private #value: number = 0   // Parse error: cannot combine 'private' keyword with '#' field
}
```


# 010 — Primitive Types

**Status:** Stage 1 — planned
**Grammar:** `specs/grammar.ebnf` §PrimitiveType, §Literal

---

## Syntax

```ebnf
<PrimitiveType> ::= "number"
                  | "string"
                  | "boolean"
                  | "bigint"
                  | "symbol"
                  | "null"
                  | "undefined"
                  | "void"
                  | "never"
                  | "unknown"

<NumberLiteral>  ::= (* decimal, hex 0x, octal 0o, binary 0b, optional _ separator *)
<StringLiteral>  ::= (* single-quoted or double-quoted; no raw string form *)
<BooleanLiteral> ::= "true" | "false"
<NullLiteral>    ::= "null"
<UndefinedLiteral> ::= "undefined"
<BigIntLiteral>  ::= (* integer literal followed by n: 42n, 0xFFn *)
```

---

## Semantics

SJS provides ten primitive types. Each primitive type is disjoint from all others: no value belongs to more than one primitive type at the same time.

### `number`

Represents all numeric values as IEEE 754 double-precision floating-point. This includes integers representable in 53 bits, positive and negative infinity (`Infinity`, `-Infinity`), and the not-a-number sentinel (`NaN`). Integer and floating-point literals both have type `number`.

Literal forms: `0`, `42`, `3.14`, `0xFF`, `0o77`, `0b1010`, `1_000_000`, `Infinity`, `NaN`.

Valid operations and result types:
- Arithmetic `+`, `-`, `*`, `/`, `%`, `**` on two `number` operands → `number`
- Unary `+`, `-` on `number` → `number`
- Comparison `<`, `>`, `<=`, `>=`, `===`, `!==` on two `number` operands → `boolean`
- Bitwise `&`, `|`, `^`, `~`, `<<`, `>>`, `>>>` — operands coerced to int32/uint32 at runtime → `number`

### `string`

Represents text as an immutable sequence of UTF-16 code units. String values are comparable with `===`/`!==`. `+` on two strings performs concatenation.

Literal forms: `"hello"`, `'world'`, template literals `` `Hello ${name}` ``.

Valid operations: `+` (concatenation) → `string`; comparison operators → `boolean`; property access `.length` → `number`; prototype methods (`.toUpperCase()`, `.slice()`, etc.) are available through the built-in `String` interface.

### `boolean`

The two-valued type. Only literal values are `true` and `false`.

Valid operations: `!` (logical not) → `boolean`; `&&`, `||` → `boolean`; `===`, `!==` → `boolean`.

### `bigint`

Arbitrary-precision integer values. `bigint` values cannot be mixed with `number` in arithmetic operations — doing so is a type error (SJS-E005).

Literal forms: `0n`, `42n`, `9007199254740993n`, `0xFFn`.

Valid operations: `+`, `-`, `*`, `/`, `%`, `**` on two `bigint` operands → `bigint`; comparison operators between two `bigint` values → `boolean`. Division truncates toward zero.

`bigint` cannot be used with bitwise operators that involve type coercion (`>>>` unsigned right shift is banned for `bigint`).

### `symbol`

Unique opaque identity values. Each call to `Symbol(description?)` produces a value unequal to all other symbols. Symbols are not coercible to `string` or `number`. The global symbol registry (`Symbol.for`) is permitted.

Literal forms: none. Symbols must be constructed via `Symbol(...)` or `Symbol.for(...)`.

Valid operations: `===`, `!==` → `boolean`; use as object property key.

### `null`

The intentional-absence type. The single value `null` has type `null`. It is not a member of any non-nullable type `T` — assigning `null` to `T` requires `T?` (i.e., `T | null`).

`null` is a keyword and cannot be rebind in SJS.

### `undefined`

The uninitialized/absent-property type. The single value `undefined` has type `undefined`. `undefined` is a reserved identifier in SJS and cannot be rebound or shadowed.

Distinction from `null`: `null` is an explicit programmer value; `undefined` signals "property absent" or "optional argument omitted." The `T?` shorthand desugars to `T | null`, not `T | null | undefined`. To include `undefined`, write `T | undefined` explicitly.

### `void`

`void` is only valid as a return type annotation. A function returning `void` may return without a value, or return `undefined` implicitly. A `void`-returning function's return value must not be used in an expression context that requires a non-void type.

`void` cannot annotate a variable, parameter, or property.

### `never`

The bottom type. `never` has no values. A function that always throws or never returns has return type `never`. An expression in dead code (unreachable after an exhaustive match or after an unconditional throw) has type `never`.

`never` is the bottom of the subtype lattice: `never <: T` for all types `T`.

Union collapse: `string | never` = `string`. `never | never` = `never`.

### `unknown`

The top type. Every value is assignable to `unknown`. A value of type `unknown` cannot be used in any typed operation without first narrowing it to a more specific type. This is the safe replacement for `dynamic` when you want maximum safety — unlike `dynamic`, no operations are permitted on `unknown` without narrowing.

`T <: unknown` for all types `T`.

---

## Type rules

### Subtype lattice boundaries

```
───────────────── (never-bottom)
never <: T

───────────────── (top-unknown)
T <: unknown
```

### Assignability of primitives

```
Γ ⊢ e : T    T <: U
──────────────────── (assign-sub)
Γ ⊢ e : U

────────────────────── (null-type)
Γ ⊢ null : null

────────────────────── (undefined-type)
Γ ⊢ undefined : undefined
```

### `void` restriction

```
f has declared return type void
Γ ⊢ return e;  in f
───────────────────────────────── (void-return-ok)   iff e : undefined | void

T ≠ void
──────────────────────────────── (void-no-var)
void is not a valid annotation for variables, parameters, or properties   → SJS-E002
```

### `bigint` and `number` isolation

```
Γ ⊢ a : bigint    Γ ⊢ b : number
──────────────────────────────────── (bigint-number-mix)
a + b  → SJS-E005
```

### Union collapse for `never`

```
─────────────────── (never-union-collapse)
T | never  ≡  T
```

---

## JS Lowering (Prototype)

All primitive type annotations are erased. Literals lower verbatim. No runtime type tags are emitted for primitive values.

```sjs
// SJS input
const n: number = 42;
const s: string = "hello";
const b: boolean = true;
const bi: bigint = 100n;
```

```javascript
// JS output (types erased)
const n = 42;
const s = "hello";
const b = true;
const bi = 100n;
```

`void` return type annotation is erased; the function body is emitted unchanged.

`never` return type is erased; the compiler may emit an `unreachable` comment in debug builds.

---

## LLVM Lowering (Future)

| SJS type  | LLVM IR type               | Notes                                      |
|-----------|----------------------------|--------------------------------------------|
| `number`  | `double`                   | IEEE 754 64-bit                            |
| `string`  | `{ i8*, i64 }`             | Fat pointer: data ptr + byte length        |
| `boolean` | `i1`                       | 0 = false, 1 = true                        |
| `bigint`  | `%sjs_bigint*`             | Pointer to GMP-style arbitrary-precision struct |
| `symbol`  | `i64*`                     | Interned pointer; identity = address       |
| `null`    | null pointer (`i8* null`)  | Nullable pointer sentinel                  |
| `undefined` | `i64` sentinel (`0xFFF...`) | Unboxed NaN-box sentinel value           |
| `void`    | `void`                     | No return value instruction                |
| `never`   | `unreachable`              | Compiler inserts `unreachable` instruction |
| `unknown` | `%sjs_any*`                | Boxed tagged value; narrowing inserts type check |

```llvm
; number: double
%n = alloca double
store double 4.200000e+01, double* %n

; string: fat pointer
%sjs_string = type { i8*, i64 }
%s = alloca %sjs_string
; ...populate data and length...

; boolean: i1
%b = alloca i1
store i1 true, i1* %b

; never: unreachable at call site
call void @always_throws()
unreachable
```

---

## Diagnostic codes

| Code | When emitted |
|------|--------------|
| `SJS-E001` | `null` or `undefined` assigned to a non-nullable type |
| `SJS-E002` | Type mismatch, including `void` used as variable annotation |
| `SJS-E005` | `bigint` and `number` operands mixed in arithmetic |

---

## Examples

### Valid

```sjs
// ✓ All primitive literal forms
const n: number = 1_000_000;
const s: string = "hello";
const b: boolean = false;
const bi: bigint = 9007199254740993n;
const sym: symbol = Symbol("key");
const nothing: null = null;

// ✓ void return type
function log(msg: string): void {
  console.log(msg);
}

// ✓ never in exhaustive branch
function assertNever(x: never): never {
  throw new Error("Unexpected value: " + String(x));
}

// ✓ unknown requires narrowing before use
function process(x: unknown): string {
  if (typeof x === "string") {
    return x.toUpperCase();  // x: string here
  }
  return String(x);
}

// ✓ bigint arithmetic stays within bigint
const sum: bigint = 100n + 200n;

// ✓ union collapse
type A = string | never;  // equivalent to string
```

### Invalid

```sjs
// ✗ SJS-E001: null not assignable to non-nullable
const name: string = null;

// ✗ SJS-E002: void cannot annotate a variable
const result: void = undefined;

// ✗ SJS-E005: bigint + number is forbidden
const bad = 42n + 1;
//               ^ SJS-E005: cannot mix bigint and number

// ✗ SJS-E002: unknown cannot be used without narrowing
function unsafe(x: unknown): number {
  return x + 1;  // SJS-E002: x is unknown; narrow first
}

// ✗ undefined is a reserved identifier — cannot rebind
const undefined = 5;  // SJS-P001: parse error / SJS-E002
```


# 011 — Union Types

**Status:** Stage 1 — planned
**Grammar:** `specs/grammar.ebnf` §Type, §BitwiseOrExpression

---

## Syntax

Union types are written using `|` in type position. The `|` operator is parsed at the same level as `<BitwiseOrExpression>` in type expressions, making it lower precedence than postfix `?`.

```ebnf
<UnionType>  ::= <PrimaryType> { "|" <PrimaryType> }

<Type>       ::= <PrimaryType> [ "?" ]
               | <FunctionType>
               | <TupleType>
               | <UnionType>
```

A leading `|` is permitted for multi-line formatting:

```sjs
type Status =
  | "pending"
  | "active"
  | "closed";
```

---

## Semantics

A value of union type `A | B` is a value that is either an `A` or a `B`. The union is open to any number of members: `A | B | C | ...`.

### Operations on union types

An operation on a value of union type `A | B` is only permitted if the operation is valid for every member of the union. If the operation is valid on `A` but not on `B`, the compiler emits SJS-E002 unless the value has first been narrowed.

```sjs
function f(x: string | number): string {
  return x.toUpperCase();  // SJS-E002: toUpperCase does not exist on number
}
```

After narrowing `x` to `string`, the property access is permitted.

### Nullable shorthand

`T?` desugars to `T | null`. The two forms are interchangeable in all type positions. `T?` does **not** include `undefined`; write `T | null | undefined` to include both.

```
T?  ≡  T | null
```

Distribution over nullable:

```
(A | B)?  ≡  A | B | null
```

### Union normalization

The type-checker applies the following normalizations before comparing union types:

- **Idempotency:** `A | A` = `A`
- **Never collapse:** `A | never` = `A`; `never | A` = `A`
- **Commutativity:** `A | B` and `B | A` are the same type
- **Associativity:** `(A | B) | C` = `A | (B | C)` = `A | B | C`
- **Unknown absorption:** `A | unknown` = `unknown` for all `A`

### Discriminated unions

When every member of a union has a literal-typed discriminant property at the same key, the union is called a **discriminated union**. The compiler uses the discriminant to narrow the full union to a single member in match arms and `if` branches.

```sjs
type Circle { kind: "circle"; radius: number; }
type Rect   { kind: "rect";   width: number; height: number; }

type Shape = Circle | Rect;

function area(s: Shape): number {
  if (s.kind === "circle") {
    return Math.PI * s.radius * s.radius;  // s: Circle
  }
  return s.width * s.height;  // s: Rect
}
```

Sum types (declared with `type Foo = A(...) | B(...)`) use `_tag` as the discriminant automatically; see `002-sum-types.md`.

### JS Lowering (Prototype)

Union types are type-level constructs only. They are completely erased at compile time. No runtime tags, no wrapper objects, no helper code.

```sjs
// SJS input
function stringify(x: number | boolean): string {
  return String(x);
}
```

```javascript
// JS output
function stringify(x) {
  return String(x);
}
```

### LLVM Lowering (Future)

**Union of primitive types:** Lowered to a tagged union struct. The tag is an `i8` identifying which member is active; the payload is a union of all member types sized to the largest member.

```llvm
; string | number
%SJS_StringOrNumber = type { i8, [8 x i8] }
; tag: 0 = string ({i8*, i64} fat ptr), 1 = number (double)
```

**Union of pointer/reference types:** Lowered to a pointer with a tag stored in the low bits (pointer tagging), or as a `{ i8 tag, i8* ptr }` pair depending on alignment guarantees.

**Discriminated unions of object types:** Lowered to a pointer to the concrete struct; the discriminant field is checked at runtime for narrowing branches.

---

## Type rules

### Introduction

```
Γ ⊢ e : A
──────────────────── (union-intro-left)
Γ ⊢ e : A | B

Γ ⊢ e : B
──────────────────── (union-intro-right)
Γ ⊢ e : A | B
```

### Elimination via narrowing

```
Γ ⊢ x : A | B    Γ, x:A ⊢ e1 : T    Γ, x:B ⊢ e2 : T
─────────────────────────────────────────────────────── (union-elim)
Γ ⊢ (narrow x to A → e1; to B → e2) : T
```

### Normalization

```
─────────────────── (union-never)
T | never  ≡  T

─────────────────── (union-idem)
T | T  ≡  T

─────────────────── (union-unknown)
T | unknown  ≡  unknown
```

### Narrowing patterns

| Pattern | Input type | Narrowed to (true branch) | Narrowed to (false branch) |
|---------|-----------|--------------------------|---------------------------|
| `x === null` | `T \| null` | `null` | `T` |
| `x !== null` | `T \| null` | `T` | `null` |
| `typeof x === "string"` | `string \| number` | `string` | `number` |
| `typeof x === "number"` | `string \| number` | `number` | `string` |
| `x instanceof C` | `C \| D` | `C` | `D` |
| `"prop" in x` | `A \| B` | members of union that have `prop` | remainder |
| `x.kind === "circle"` | discriminated union | variant with `kind: "circle"` | remaining variants |

---

## Diagnostic codes

| Code | When emitted |
|------|--------------|
| `SJS-E002` | Operation applied to a union-typed value where the operation is not valid on all members |

---

## Examples

### Valid

```sjs
// ✓ Explicit union type
function format(x: string | number): string {
  if (typeof x === "string") {
    return x;           // x: string
  }
  return x.toFixed(2);  // x: number
}

// ✓ Nullable shorthand as union sugar
let name: string? = null;  // string | null

// ✓ Discriminated union narrowing
type Success { status: "ok";   value: number; }
type Failure { status: "fail"; error: string; }
type Response = Success | Failure;

function handle(r: Response): string {
  if (r.status === "ok") {
    return String(r.value);  // r: Success
  }
  return r.error;            // r: Failure
}

// ✓ Union in return type
function divide(a: number, b: number): number | null {
  if (b === 0) return null;
  return a / b;
}

// ✓ Three-member union with typeof narrowing
function printAll(x: string | number | boolean): void {
  if (typeof x === "string") {
    console.log(x.length);
  } else if (typeof x === "number") {
    console.log(x.toFixed(2));
  } else {
    console.log(x ? "yes" : "no");
  }
}
```

### Invalid

```sjs
// ✗ SJS-E002: method not valid on all union members
function bad(x: string | number): string {
  return x.toUpperCase();  // SJS-E002: toUpperCase not on number
}

// ✗ SJS-E002: arithmetic not valid on all union members
function add(x: string | number): number {
  return x + 1;  // SJS-E002: + on string | number is ambiguous
}
```


# 012 — Array and Tuple Types

**Status:** Stage 1 — planned
**Grammar:** `specs/grammar.ebnf` §ArrayType, §TupleType, §ArrayLiteral

---

## Syntax

```ebnf
<ArrayType>  ::= <PrimaryType> "[" "]"
               (* left-recursive; T[][] = array of array of T *)

<TupleType>  ::= "[" [ <Type> { "," <Type> } ] "]"
               (* empty tuple [] is valid: zero-element tuple *)

<ArrayLiteral> ::= "[" [ <ArrayElement> { "," <ArrayElement> } [ "," ] ] "]"
<ArrayElement> ::= [ "..." ] <AssignmentExpression>
                 | (* elision — empty element *)
```

Alternative generic form `Array<T>` and `ReadonlyArray<T>` are accepted as `<TypeRef>` with one type argument.

---

## Semantics

### Array types: `T[]`

`T[]` is the type of a homogeneous, mutable, dynamically-sized sequence of values of type `T`. It is equivalent to `Array<T>`. Every element has type `T`; no element may be assigned a value of a type not assignable to `T`.

Array types are **covariant for reading** and **invariant for writing**. Assigning a `string[]` to a `(string | number)[]` variable is allowed (widening read); passing a `string[]` where a `(string | number)[]` is expected in a mutable parameter position is a type error (write invariance).

The type `ReadonlyArray<T>` (or `readonly T[]`) describes an immutable view of an array. It exposes no mutating methods (`.push`, `.pop`, `.splice`, etc.). A `T[]` is assignable to `ReadonlyArray<T>`, but not vice versa: a read-only view cannot be widened back to a mutable array.

### Tuple types: `[A, B, C]`

`[A, B, C]` is a fixed-length, heterogeneous array. Element at index 0 has type `A`, index 1 type `B`, index 2 type `C`. The length is a compile-time constant.

Accessing an index within the declared length yields the element type. Accessing an out-of-bounds constant index is a type error (SJS-E002). Accessing a dynamic index yields the union of all element types.

Tuple types are subtypes of their corresponding array type only in read-only context:

```
[A, B] <: ReadonlyArray<A | B>
[A, B] is NOT <: (A | B)[]   -- mutable array would allow push of wrong type
```

**Rest elements** in tuple types: `[A, ...B[], C]` denotes a tuple with a fixed first element of type `A`, a fixed last element of type `C`, and zero or more middle elements of type `B`. Rest elements must appear at most once per tuple type.

### Standard array operations and types

| Method / property | Type signature | Notes |
|-------------------|---------------|-------|
| `.length` | `number` | Array and tuple |
| `.push(v: T)` | `(T) => number` | Mutating; not on `ReadonlyArray` |
| `.pop()` | `() => T \| undefined` | Mutating; not on `ReadonlyArray` |
| `.map<U>(f: (T) => U)` | `(T => U) => U[]` | Returns new array |
| `.filter(f: (T) => boolean)` | `(T => boolean) => T[]` | Returns new array |
| `.reduce<U>(f: (U, T) => U, init: U)` | `(U, T) => U, U) => U` | Folds |
| `.slice(start?, end?)` | `(number?, number?) => T[]` | Returns new array |
| `.indexOf(v: T)` | `(T) => number` | Returns -1 if absent |
| `.includes(v: T)` | `(T) => boolean` | |
| `[i]` element access | `T` for array; element type for tuple | |

---

## Type rules

### Array construction

```
Γ ⊢ e1 : T, ..., Γ ⊢ eN : T
───────────────────────────── (array-literal)
Γ ⊢ [e1, ..., eN] : T[]

Γ ⊢ [] with expected type T[]
──────────────────────────── (array-empty)
Γ ⊢ [] : T[]
```

### Tuple construction

```
Γ ⊢ e1 : A    Γ ⊢ e2 : B    ...    Γ ⊢ eN : Z
─────────────────────────────────────────────── (tuple-literal)
Γ ⊢ [e1, e2, ..., eN] : [A, B, ..., Z]
```

### Element access

```
Γ ⊢ a : T[]    Γ ⊢ i : number
────────────────────────────── (array-index)
Γ ⊢ a[i] : T | undefined

Γ ⊢ t : [A, B, C]    k = 0
────────────────────────────── (tuple-index-known)
Γ ⊢ t[0] : A

Γ ⊢ t : [A, B, C]    k ≥ 3   (constant out-of-bounds)
────────────────────────────── (tuple-index-oob)
Γ ⊢ t[k]  → SJS-E002
```

### Subtyping

```
T <: U
──────────────────────────── (array-covariant-read)
ReadonlyArray<T> <: ReadonlyArray<U>

──────────────────────────────────── (readonly-array-sub)
T[] <: ReadonlyArray<T>

[A, B] <: ReadonlyArray<A | B>
──────────────────────────────────── (tuple-to-readonly-array)
(only in read context)
```

---

## JS Lowering (Prototype)

`T[]` and `ReadonlyArray<T>` lower to plain JavaScript arrays. Tuple types lower to plain JavaScript arrays; the fixed-length and heterogeneous type information is type-level only and erased.

```sjs
// SJS input
const nums: number[] = [1, 2, 3];
const pair: [string, number] = ["age", 30];
const ro: ReadonlyArray<string> = ["a", "b"];
```

```javascript
// JS output
const nums = [1, 2, 3];
const pair = ["age", 30];
const ro = ["a", "b"];
```

No wrapper types, no runtime length checks, no read-only enforcement at runtime. `ReadonlyArray<T>` readonly constraint is compile-time only.

---

## LLVM Lowering (Future)

**`T[]` (mutable array):** Lowered to a heap-allocated struct containing a data pointer, a length, and a capacity. Analogous to a `Vec<T>` in Rust.

```llvm
; T[] where T = double
%sjs_array_double = type { double*, i64, i64 }
;                          ^data   ^len ^cap
```

Element access compiles to a bounds check followed by a `getelementptr` and load. The bounds check can be elided when the index is a compile-time constant within range.

**Tuple `[A, B, C]`:** Lowered to a stack-allocated packed struct with typed fields in declaration order.

```llvm
; [string, number]  →  { %sjs_string, double }
%sjs_tuple_str_num = type { %sjs_string, double }

; Constructing ["age", 30]:
%t = alloca %sjs_tuple_str_num
; store "age" into field 0...
; store 30.0 into field 1...
```

Tuple element access at a constant index compiles directly to `getelementptr` with no bounds check (index is statically verified).

**`ReadonlyArray<T>`:** Same representation as `T[]`; the mutation restriction is type-level only and generates no additional LLVM IR.

---

## Diagnostic codes

| Code | When emitted |
|------|--------------|
| `SJS-E001` | Value of wrong element type assigned into array or tuple |
| `SJS-E002` | Tuple index access at a compile-time constant that is out of bounds; or mutable array method called on `ReadonlyArray` |

---

## Examples

### Valid

```sjs
// ✓ Homogeneous array
const scores: number[] = [95, 87, 100];

// ✓ Array of nullable elements
const names: string?[] = ["Alice", null, "Bob"];

// ✓ Tuple with distinct element types
const point: [number, number] = [3, 4];
const entry: [string, number] = ["count", 42];

// ✓ ReadonlyArray prevents mutation
const frozen: ReadonlyArray<string> = ["x", "y"];

// ✓ Nested array type
const matrix: number[][] = [[1, 2], [3, 4]];

// ✓ Array map and filter
const doubled: number[] = [1, 2, 3].map(x => x * 2);
const evens: number[] = [1, 2, 3, 4].filter(x => x % 2 === 0);

// ✓ Tuple destructuring
const [x, y]: [number, number] = [10, 20];

// ✓ Rest tuple
function head<T>(xs: [T, ...T[]]): T {
  return xs[0];
}
```

### Invalid

```sjs
// ✗ SJS-E001: wrong element type
const bad: number[] = [1, "two", 3];
//                        ^^^^^ SJS-E001: string not assignable to number

// ✗ SJS-E002: tuple index out of bounds
const pair: [string, number] = ["a", 1];
const third = pair[2];  // SJS-E002: index 2 out of range for [string, number]

// ✗ SJS-E002: mutating a ReadonlyArray
const ro: ReadonlyArray<number> = [1, 2, 3];
ro.push(4);  // SJS-E002: push does not exist on ReadonlyArray<number>

// ✗ SJS-E001: tuple element type mismatch
const t: [string, number] = [42, "hello"];
//                            ^^ SJS-E001: number not assignable to string
```


# 013 — Function Types

**Status:** Stage 1 — planned
**Grammar:** `specs/grammar.ebnf` §FunctionType, §FunctionTypeParam, §ArrowFunction, §FunctionDecl

---

## Syntax

```ebnf
<FunctionType>          ::= "(" [ <FunctionTypeParamList> ] ")" "=>" <Type>

<FunctionTypeParamList> ::= <FunctionTypeParam> { "," <FunctionTypeParam> }
                          | "..." <Identifier> ":" <Type>

<FunctionTypeParam>     ::= <Identifier> [ "?" ] ":" <Type>
```

Function types appear wherever a `<Type>` is expected: variable annotations, parameter types, return types, object type (`type` brace form) members, and type aliases.

Generic function types use `<TypeParameters>` from the grammar:

```sjs
type Mapper<A, B> = (a: A) => B;
type Identity     = <T>(x: T) => T;
```

---

## Semantics

A function type describes the shape of a callable value: its parameter types and its return type. Parameter names in function types are documentary only — they are ignored for compatibility checking.

### Parameter forms

**Required parameter:** `(x: T)` — the argument is mandatory and must be of type `T`.

**Optional parameter:** `(x?: T)` — the argument may be omitted. Inside the function body, `x` has type `T | undefined`. From the caller's perspective, the argument may be passed as `T` or omitted entirely.

**Rest parameter:** `(...args: T[])` — zero or more trailing arguments of type `T`, collected into an array of type `T[]`.

Parameters with default values are declared on function declarations, not in function type annotations. In the function type, a parameter with a default is represented as optional (`?`).

### Return type `void`

A function type with return type `void` describes a function whose return value is not meaningful. Callers must not use the return value in a typed expression. The function body may return explicitly with no value, return `undefined`, or fall off the end.

### Return type `never`

A function type with return type `never` describes a function that never returns normally — it always throws or enters an infinite loop. A call to a `never`-returning function widens the control flow after the call to dead code.

### Generic function types

A function type may introduce its own type parameters: `<T>(x: T) => T`. These type parameters are bound per call and inferred from the arguments. No `extends` constraints are permitted on type parameters (banned in SJS).

### Overloads

TypeScript-style function overload declarations (multiple signatures followed by an implementation signature) are **not supported** in SJS. Use union parameter types or separate named functions instead.

```sjs
// ✓ Union params instead of overloads
function process(x: string | number): string { ... }

// ✗ Overload declaration syntax is banned
function process(x: string): string;
function process(x: number): string;
function process(x: string | number): string { ... }  // SJS-P001 on first overload line
```

---

## Type rules

### Subtyping (contravariant parameters, covariant return)

```
S1 <: P1    P2 <: S2    R1 <: R2
──────────────────────────────────────── (fn-subtype)
(P1 => R1) <: (P2 => R2)
```

Parameters are **contravariant**: if the supertype function accepts a wider parameter type, the subtype function must accept at least as wide. Return types are **covariant**: the subtype may return a narrower type.

Practical consequences:
- `(a: string | number) => number` is a subtype of `(a: string) => number` (contravariance: wider param → subtype).
- `(a: string) => number` is NOT a subtype of `(a: string | number) => number` (would accept a `number` argument illegally).
- `(a: string) => 42` (literal return) is a subtype of `(a: string) => number` (covariance: narrower return → subtype).

### Optional parameters and arity

```
Γ ⊢ f : (x: T) => R
──────────────────────────── (fn-optional-compat)
f is assignable to (x?: T) => R    (fewer required params → subtype)
```

A function that requires a parameter can be assigned to a context that makes that parameter optional.

### Call expression typing

```
Γ ⊢ f : (p1: P1, ..., pN: PN) => R
Γ ⊢ a1 : A1, ..., Γ ⊢ aN : AN
A1 <: P1, ..., AN <: PN
──────────────────────────────────── (call)
Γ ⊢ f(a1, ..., aN) : R

Γ ⊢ f : T    T not a function type
──────────────────────────────────── (call-non-fn)
Γ ⊢ f(...)  → SJS-E003
```

### Generic call instantiation

```
Γ ⊢ f : <T>(x: T) => R(T)
Γ ⊢ a : A
────────────────────────── (generic-call-infer)
Γ ⊢ f(a) : R(A)          -- T inferred as A
```

---

## JS Lowering (Prototype)

Function type annotations are erased. Regular JS functions and arrow functions are emitted. No wrappers, no arity checks, no type guards at runtime.

```sjs
// SJS input
const add: (a: number, b: number) => number = (a, b) => a + b;

function apply<T, U>(f: (x: T) => U, value: T): U {
  return f(value);
}
```

```javascript
// JS output
const add = (a, b) => a + b;

function apply(f, value) {
  return f(value);
}
```

Closures lower to JavaScript closures; no explicit environment struct is created in the prototype.

---

## LLVM Lowering (Future)

**Non-capturing function:** Lowered to a plain LLVM function pointer `R (*)(P1, P2, ...)`.

**Closure (captures environment):** Lowered to a fat pointer `{ fnptr, env* }` where `env*` points to a heap-allocated struct containing the captured values.

```llvm
; (number) => number  — non-capturing
%fn_num_num = type i64 (double)*

; Closure: captures x: number
%closure_env = type { double }          ; captured x
%closure_fn  = type { i64 (double, %closure_env*)*, %closure_env* }
```

Generic function types are monomorphized at compile time: each distinct instantiation produces a separate LLVM function with concrete types substituted.

```llvm
; <T>(x: T) => T  instantiated for T = double
define double @identity_double(double %x) {
  ret double %x
}
```

---

## Diagnostic codes

| Code | When emitted |
|------|--------------|
| `SJS-E002` | Argument type not assignable to parameter type |
| `SJS-E003` | Calling a value that is not a function type |

---

## Examples

### Valid

```sjs
// ✓ Function type annotation on variable
const double: (x: number) => number = x => x * 2;

// ✓ Function type as parameter
function map(arr: number[], f: (x: number) => number): number[] {
  return arr.map(f);
}

// ✓ Optional parameter in function type
const greet: (name?: string) => string = (name) => {
  return "Hello, " + (name ?? "stranger");
};

// ✓ Rest parameter in function type
const sum: (...args: number[]) => number = (...args) => {
  return args.reduce((acc, x) => acc + x, 0);
};

// ✓ Generic function type
function identity<T>(x: T): T {
  return x;
}
const n: number = identity(42);
const s: string = identity("hi");

// ✓ Contravariance: wider param is subtype
const widerFn: (x: string | number) => boolean = x => true;
const narrowCtx: (x: string) => boolean = widerFn;  // ok: contravariant

// ✓ void return — value not used
function forEach(arr: number[], f: (x: number) => void): void {
  for (const x of arr) { f(x); }
}

// ✓ never return in union
function fail(msg: string): never {
  throw new Error(msg);
}
```

### Invalid

```sjs
// ✗ SJS-E002: argument type mismatch
const double: (x: number) => number = x => x * 2;
double("hello");  // SJS-E002: string not assignable to number

// ✗ SJS-E003: calling non-function
const n: number = 42;
n();  // SJS-E003: number is not callable

// ✗ SJS-E002: covariance violation — subtype must return narrower type
// (assigning a wider-return function to narrower-return type)
const getStr: () => string = () => 42 as string;
//                                 ^^ SJS-E002: number not assignable to string

// ✗ Overload syntax is banned
function parse(x: string): number;     // SJS-P001: overload declarations not supported
function parse(x: string): number { return parseInt(x, 10); }
```


# 014 — Object Types

**Status:** Stage 1 — planned
**Grammar:** `specs/grammar.ebnf` §ObjectTypeLiteral, §ObjectTypeMember, §IndexSignature

---

## Syntax

```ebnf
<ObjectTypeLiteral> ::= "{" { <ObjectTypeMember> } "}"

<ObjectTypeMember>  ::= [ "readonly" ] <Identifier> [ "?" ] ":" <Type> ";"
                      | <IndexSignature>
                      | <InterfaceMethod>

<IndexSignature>    ::= "[" <Identifier> ":" <PrimitiveType> "]" ":" <Type> ";"
                        (* PrimitiveType must be string or number *)

<InterfaceMethod>   ::= <Identifier>
                        [ <TypeParameters> ]
                        "(" [ <ParameterList> ] ")"
                        ":" <Type> ";"
```

Object type literals are interchangeable with single object-type declarations (the `type` brace form, see `006-interfaces.md`) for structural compatibility purposes. The `<InterfaceMethod>` rule above is the shared method-signature rule, reused by both object type literals and the `type` brace form.

---

## Semantics

An object type literal describes the structural shape required of a value. SJS uses **structural typing** for all object types — both anonymous literals and the named `type` brace form: a value satisfies an object type if it provides all required members with compatible types, regardless of how the value was constructed or declared.

### Required property

```sjs
{ name: string }
```

The property `name` must be present and its value must be assignable to `string`. Accessing `name` on a value of this type always yields `string`.

### Optional property

```sjs
{ age?: number }
```

The property `age` may be absent. When the property is absent, reading it yields `undefined`. The effective type of the property inside the object is `number | undefined`. To use the value as `number`, narrow it first.

### Readonly property

```sjs
{ readonly id: number }
```

The property `id` may be read but not written after construction. This constraint is enforced at compile time only — no runtime protection is generated. A value with `{ readonly id: number }` is assignable to `{ id: number }` for reading, but cannot be assigned to a context that allows writes to `id`.

`readonly` on a property does not make nested object values immutable — only the property reference itself is frozen.

### Index signature

```sjs
{ [key: string]: number }
```

All string-keyed properties not explicitly named must have type `number`. An object type may combine named properties with an index signature, provided the named property types are assignable to the index signature's value type:

```sjs
{ name: string; [key: string]: string }  // ✓ name: string satisfies string index
{ name: number; [key: string]: string }  // ✗ SJS-E002: number not assignable to string index
```

Only `string` and `number` are valid index signature key types.

### Excess property checking

When an object literal is directly assigned to a typed variable or passed directly as a function argument, the compiler checks for properties that do not appear in the target type. This is called the **fresh object check**.

```sjs
type Point = { x: number; y: number; };
const p: Point = { x: 1, y: 2, z: 3 };  // SJS-W006: excess property z
```

When an object is first assigned to a variable of a compatible but untyped type and then passed on, excess property checking is not applied (the object is no longer "fresh"):

```sjs
const obj = { x: 1, y: 2, z: 3 };
const p: Point = obj;  // ok — obj is not a fresh literal at this assignment
```

Excess property checking is a warning (SJS-W006), not an error, because it does not violate soundness — the extra property is simply ignored by the type system.

### Method shorthand in object types

Object type members may declare methods using the method signature shorthand:

```sjs
{
  area(): number;
  scale(factor: number): void;
}
```

Method signatures are interchangeable with property signatures using function types:

```sjs
{ area(): number }  ≡  { area: () => number }
```

---

## Type rules

### Width subtyping (structural)

A type with more properties is a subtype of a type with fewer properties (structural subtyping):

```
{ p: T, q: U, ...rest } <: { p: T }
──────────────────────────────────── (width-sub)
```

### Depth subtyping (covariant for readable properties)

```
S <: T
──────────────────────────────── (depth-sub-read)
{ p: S } <: { p: T }             -- for reading

S ≠ T
──────────────────────────────── (depth-sub-write)
{ p: S } is NOT <: { p: T }      -- for writing (invariant)
```

In practice, SJS does not distinguish read/write positions for object properties at the property level (no separate `get`/`set` types). Depth subtyping for mutable properties is treated as invariant in assignments that involve writes.

### Readonly subtyping

```
──────────────────────────────────────────── (readonly-not-mutable)
{ readonly p: T } is NOT <: { p: T }
```

A readonly-annotated property type is not assignable to a mutable property of the same type, because the target type would permit writes that the source forbids.

### Optional property access

```
Γ ⊢ obj : { p?: T }
──────────────────────────────── (opt-prop-read)
Γ ⊢ obj.p : T | undefined
```

### Excess property check

```
obj literal {p: T, q: U}    target type does not declare q
──────────────────────────────────────────────────────────── (excess-prop)
→ SJS-W006
```

---

## JS Lowering (Prototype)

Object type annotations are erased. Object literals lower verbatim. `readonly` is type-level only. No runtime shape checks are generated.

```sjs
// SJS input
type Config {
  readonly host: string;
  port?: number;
}

const cfg: Config = { host: "localhost", port: 8080 };
```

```javascript
// JS output
const cfg = { host: "localhost", port: 8080 };
```

Index signatures are erased; the underlying JS object accepts any string key at runtime.

---

## LLVM Lowering (Future)

Object types lower to LLVM structs with fields in property declaration order (for statically-known shapes).

```llvm
; { x: number; y: number }
%Point = type { double, double }
;               ^x       ^y

; Optional field { age?: number } → { i1 present, double value }
%OptNum = type { i1, double }
```

`readonly` properties generate no additional LLVM IR; the restriction is enforced at compile time.

Index signatures lower to a hash map structure (`%sjs_map`) keyed by string, appended after any statically-declared fields.

```llvm
; { name: string; [key: string]: string }
%DynObj = type { %sjs_string, %sjs_map* }
;                ^name field   ^dynamic properties
```

---

## Diagnostic codes

| Code | When emitted |
|------|--------------|
| `SJS-E001` | Value of wrong type assigned to a typed property |
| `SJS-E002` | Named property type not assignable to index signature type; readonly property assigned; required property missing |
| `SJS-W006` | Excess property detected on a fresh object literal |

---

## Examples

### Valid

```sjs
// ✓ Basic object type
const point: { x: number; y: number; } = { x: 3, y: 4 };

// ✓ Optional property
type User {
  name: string;
  age?: number;
}
const u: User = { name: "Alice" };
const age: number | undefined = u.age;

// ✓ Readonly property
type Entity {
  readonly id: number;
  label: string;
}
const e: Entity = { id: 1, label: "root" };
e.label = "leaf";   // ok — mutable

// ✓ Index signature
const counts: { [key: string]: number } = {};
counts["hits"] = 42;
counts["misses"] = 7;

// ✓ Fresh object no-excess via variable
type Point = { x: number; y: number; };
const raw = { x: 1, y: 2, z: 3 };
const p: Point = raw;  // ok — raw is not a fresh literal at this point

// ✓ Structural satisfaction without explicit annotation
type Printable { toString(): string; }
function print(p: Printable): void { console.log(p.toString()); }
print({ toString() { return "hello"; } });  // satisfies Printable structurally

// ✓ Object type with method
type Scalable {
  scale(factor: number): Scalable;
}
```

### Invalid

```sjs
// ✗ SJS-W006: excess property on fresh literal
type Point = { x: number; y: number; };
const bad: Point = { x: 1, y: 2, z: 3 };
//                               ^ SJS-W006: z is not in Point

// ✗ SJS-E002: readonly property written after construction
type Frozen { readonly val: number; }
const f: Frozen = { val: 10 };
f.val = 20;  // SJS-E002: val is readonly

// ✗ SJS-E002: named property type incompatible with index signature
const bad2: { id: number; [k: string]: string } = { id: 1 };
//                         ^^^^^^^^^^^^^^^^^^^^^^
// SJS-E002: property id has type number, not assignable to index type string

// ✗ SJS-E001: wrong property type in literal
const p2: { x: number; } = { x: "oops" };
//                               ^^^^^^ SJS-E001: string not assignable to number
```


# 015 — Type Inference

**Status:** Stage 1 — planned
**Grammar:** `specs/grammar.ebnf` §VariableDecl, §FunctionDecl, §ArrowFunction

---

## Syntax

No special syntax. Type inference operates on existing constructs when a type annotation is absent.

---

## Semantics

SJS infers types for declarations and expressions that lack explicit annotations, reducing annotation burden while preserving soundness. Inference is **local** (within a single expression or statement) and **bidirectional** (propagates expected types inward as contextual types).

### Variable inference

**`const` declaration:** The type is inferred from the initializer. Literal values are inferred as **literal types** (string, number, boolean literal types), because `const` bindings cannot be reassigned.

```sjs
const x = 42;        // x: 42  (number literal type)
const s = "hello";   // s: "hello"  (string literal type)
const b = true;      // b: true  (boolean literal type)
```

**`let` declaration:** The type is inferred from the initializer but **widened** to the base primitive type, because `let` bindings may be reassigned.

```sjs
let x = 42;        // x: number  (not 42)
let s = "hello";   // s: string  (not "hello")
let b = true;      // b: boolean  (not true)
```

**`const` with `null`:** A `const` initialized to `null` has type `null`. It is not widened to a nullable type.

```sjs
const n = null;    // n: null
let m = null;      // m: null  (cannot widen null further without annotation)
```

**Array literal:** Inferred as `T[]` where `T` is the union of all element types. An empty array literal `[]` requires a contextual type; without one it is typed as `never[]` (SJS-W001 in strict mode).

```sjs
const arr = [1, 2, 3];       // arr: number[]
const mixed = [1, "two"];    // mixed: (number | string)[]
const empty: string[] = [];  // ok — contextual type provides T
```

**Object literal:** Inferred as an object type literal whose property types are inferred from each value.

```sjs
const obj = { x: 1, y: "hi" };  // obj: { x: number; y: string; }
```

### Function return type inference

If a function or method has no explicit return type annotation, the return type is inferred as the union of all types returned by `return` statements in the body. An implicit fall-off (reaching the end of the function body without a `return`) contributes `undefined` to the union.

```sjs
function f(flag: boolean) {
  if (flag) return 42;
  return "no";
}
// inferred return type: number | string
```

A function with no `return` statement infers return type `void`.

### Generic call inference

When a generic function is called without explicit type arguments, SJS infers the type parameters from the argument types.

```sjs
function identity<T>(x: T): T { return x; }

const n = identity(42);      // T inferred as number; n: number
const s = identity("hi");    // T inferred as string;  s: string
```

If inference is ambiguous or fails, the type parameter defaults to `unknown` and SJS-W001 may be emitted in strict mode.

### Contextual typing

SJS applies **contextual typing** when an expression appears in a position that has a known expected type. The expected type is propagated inward to help infer types for unannotated sub-expressions.

**Arrow function in callback context:**

```sjs
const nums: number[] = [1, 2, 3];
const doubled = nums.map(x => x * 2);
// x contextually typed as number (from number[].map callback)
```

**Object literal property:**

```sjs
const cfg: { port: number } = { port: 8080 };
// 8080 contextually typed as number (from port: number)
```

**Function argument:**

```sjs
function run(f: () => number): number { return f(); }
run(() => 42);  // arrow return contextually typed as number
```

### Widening rules summary

| Declaration | Literal | Widened type |
|-------------|---------|-------------|
| `const x = "a"` | `"a"` (string literal) | `"a"` — no widening |
| `let x = "a"` | `"a"` | `string` |
| `const x = 1` | `1` (number literal) | `1` — no widening |
| `let x = 1` | `1` | `number` |
| `const x = true` | `true` | `true` — no widening |
| `let x = true` | `true` | `boolean` |
| `const x = [1]` | `[1]` | `number[]` — arrays always widen |
| `let x = [1]` | `[1]` | `number[]` |

Array literals are always widened to `T[]` regardless of `const`/`let`, because the array is mutable (elements can be pushed/set).

### No inference for

The following positions require explicit annotation or `dynamic`:

- **Function parameters:** `function f(x)` — `x` must be annotated. Without annotation in strict mode, SJS-W001 is emitted and `x` is treated as `dynamic`.
- **Class properties without initializer:** `class C { x; }` — `x` must be annotated.
- **Recursive function return types** where the recursion makes the inference non-terminating.

---

## Type rules

### Const literal inference

```
Γ ⊢ e : T (literal type of e)    e is a literal
─────────────────────────────────────────────── (infer-const-literal)
Γ ⊢ const x = e  :  x has type T
```

### Let widening

```
Γ ⊢ e : T    widen(T) = T'
─────────────────────────── (infer-let-widen)
Γ ⊢ let x = e  :  x has type T'
```

where `widen("hello") = string`, `widen(42) = number`, `widen(true) = boolean`, `widen(null) = null`, `widen(T[]) = T[]`.

### Return type union inference

```
Γ ⊢ e1 : T1    Γ ⊢ e2 : T2
──────────────────────────────────────────────────── (infer-return-union)
Γ ⊢ function f() { return e1; ... return e2; } : () => T1 | T2
```

### Contextual typing propagation

```
expected(position) = T    Γ, ctx:T ⊢ e : U    U <: T
───────────────────────────────────────────────────── (contextual-type)
Γ ⊢ e : T
```

---

## JS Lowering (Prototype)

Type inference is entirely compile-time. It produces no JavaScript output changes. The inferred type information drives type checking; after checking it is discarded (or retained only for IDE/LSP use).

```sjs
// SJS input — no annotations
const greet = (name) => "Hello, " + name;
//   ^ return type inferred as string; name inferred as dynamic (or string from context)
```

```javascript
// JS output — identical (inference adds no runtime code)
const greet = (name) => "Hello, " + name;
```

---

## LLVM Lowering (Future)

Inferred types are resolved at compile time and used to select concrete LLVM IR types. Generic functions are **monomorphized**: each distinct instantiation (per inferred set of type arguments) generates a separate LLVM function with the concrete types substituted.

```llvm
; identity<T>(x: T): T  — two instantiations
define double @identity_double(double %x) { ret double %x }
define { i8*, i64 } @identity_string({ i8*, i64 } %x) { ret { i8*, i64 } %x }
```

Widening has no effect on LLVM IR — `let x = 1` and `const x = 1` both lower to the same `double` alloca.

---

## Diagnostic codes

| Code | When emitted |
|------|--------------|
| `SJS-W001` | Unannotated function parameter or class property inferred as `dynamic` in strict mode |

---

## Examples

### Valid

```sjs
// ✓ const — literal types inferred
const greeting = "hello";  // "hello"
const count = 0;            // 0
const flag = false;         // false

// ✓ let — widened types inferred
let msg = "hi";    // string
let num = 100;     // number
let on = true;     // boolean

// ✓ Return type inferred from returns
function classify(n: number) {
  if (n > 0) return "positive";
  if (n < 0) return "negative";
  return "zero";
}
// inferred: () => "positive" | "negative" | "zero"  (string literal union)

// ✓ Generic inference from arguments
function wrap<T>(val: T): T[] { return [val]; }
const ns = wrap(42);    // T = number; ns: number[]
const ss = wrap("hi");  // T = string; ss: string[]

// ✓ Contextual typing in callback
const results = [1, 2, 3].map(n => n * 2);
// n is contextually number; results: number[]

// ✓ Inferred object shape
const config = { host: "localhost", port: 3000 };
// config: { host: string; port: number }  (let-widened property types)
```

### Invalid

```sjs
// ✗ SJS-W001: unannotated parameter in strict mode
function double(x) {  // SJS-W001: x implicitly dynamic
  return x * 2;
}

// ✗ SJS-W001: unannotated class property
class Box {
  value;  // SJS-W001: value has no annotation and no initializer
}

// ✗ Inferred return type mismatch with explicit annotation
function getNum(): number {
  if (Math.random() > 0.5) return 42;
  return "oops";  // SJS-E002: string not assignable to number
}
```


# 016 — Type Narrowing

**Status:** Stage 1 — planned
**Grammar:** `specs/grammar.ebnf` §TypeAssertion, §IfStatement, §EqualityExpression, §UnaryExpression

---

## Syntax

No special narrowing syntax beyond existing JavaScript operators. The only manual narrowing form is the `as` type assertion:

```ebnf
<TypeAssertion> ::= <Expression> "as" <Type>
```

`as` appears at the expression level, after `<PrimaryExpression>`. The `<Type>expr` prefix cast form is banned (parse error — syntactically ambiguous with JSX).

All other narrowing is performed by the compiler's Control Flow Analysis (CFA) based on existing operator forms in `<EqualityExpression>`, `<UnaryExpression>`, `<RelationalExpression>`, and `<IfStatement>`.

---

## Semantics

Type narrowing reduces the static type of a value within a branch or scope based on the outcome of a runtime check. Narrowings are tracked per-variable by CFA. At join points (after if-else, after loops) the type is the union of all types that flow in from each predecessor branch.

### Narrowing patterns

#### 1. Null and undefined checks

```sjs
let x: string? = getValue();
if (x !== null) {
  x.toUpperCase();  // x: string in this branch
}
// x: string | null here (join)
```

`x === null` narrows `x` to `null` in the true branch and to `T` in the false branch (where the original type was `T | null`).

`x == null` (loose equality) narrows both `null` and `undefined` out of the type. SJS lints against `==`/`!=`, so this form emits SJS-L001 while still narrowing.

#### 2. `typeof` checks

`typeof x === "<primitive>"` narrows `x` to the corresponding primitive type:

| `typeof` string | Narrowed SJS type |
|-----------------|-------------------|
| `"string"` | `string` |
| `"number"` | `number` |
| `"boolean"` | `boolean` |
| `"bigint"` | `bigint` |
| `"symbol"` | `symbol` |
| `"function"` | function type (any callable) |
| `"object"` | `object \| null` (JS coerces null to "object") |
| `"undefined"` | `undefined` |

After a `typeof x === "string"` check, `x` has type `string` in the true branch and the remaining union members in the false branch.

#### 3. `instanceof` checks

`x instanceof C` narrows `x` to `C` in the true branch. The input type of `x` must include `C` or a supertype of `C`; otherwise the check is always-false (SJS-W003).

```sjs
function handle(err: Error | string): string {
  if (err instanceof Error) {
    return err.message;  // err: Error
  }
  return err;            // err: string
}
```

#### 4. `in` operator

`"prop" in x` narrows `x` to the subset of the union whose types declare `prop`. Members that do not declare `prop` are narrowed out in the true branch.

```sjs
type A { a: number; }
type B { b: string; }
type AB = A | B;

function use(v: AB): string {
  if ("a" in v) {
    return String(v.a);  // v: A
  }
  return v.b;            // v: B
}
```

#### 5. Discriminated union narrowing

When a union's members share a common literal-typed discriminant property (e.g., `kind: "circle"` vs `kind: "rect"`), an equality check on that property narrows the union to the matching member(s).

```sjs
type Shape = { kind: "circle"; radius: number }
           | { kind: "rect";   width: number; height: number };

function area(s: Shape): number {
  if (s.kind === "circle") {
    return Math.PI * s.radius * s.radius;  // s: { kind: "circle"; radius: number }
  }
  return s.width * s.height;               // s: { kind: "rect"; ... }
}
```

Sum types (declared with `type T = V1(...) | V2(...)`) use `_tag` as their discriminant; see `002-sum-types.md` and `003-match.md`.

#### 6. Truthiness narrowing

A truthiness check `if (x)` narrows out the falsy members of the union: `null`, `undefined`, `0`, `""` (empty string), `false`, and `0n`. This narrowing is applied in Phase 2+.

```sjs
function greet(name: string | null): string {
  if (name) {
    return "Hello, " + name;  // name: string (null narrowed out)
  }
  return "Hello, stranger";
}
```

Note: truthiness narrowing does not narrow `number` to non-zero `number`, as there is no distinct non-zero-number type in SJS.

#### 7. Assignment narrowing

After an assignment `x = expr`, the type of `x` in the subsequent code is narrowed to the type of `expr`, even if the declared type of `x` is broader.

```sjs
let val: string | number = getVal();
val = "fixed";
val.toUpperCase();  // val: string after assignment
```

### `as` type assertion

`expr as T` is an explicit type assertion that overrides the inferred type of `expr` with `T`. It generates no runtime code and does not produce a checked cast — the programmer asserts that the value is of type `T`.

**Restrictions:**
- `T` must overlap with the inferred type of `expr`: `T <: typeof expr` or `typeof expr <: T`. An assertion between unrelated types is a type error (SJS-E002).
- `as` cannot widen to `dynamic` except when the source type is `unknown` (use `as dynamic` to opt out of type checking on a value).
- No `<T>expr` prefix form — that syntax is banned because it is ambiguous with JSX in SJS's grammar.

```sjs
const x: unknown = fetchData();
const s = x as string;  // ok: unknown → string is a narrowing assertion
```

### Control Flow Analysis (CFA)

The compiler tracks narrowed types through:

- `if` / `else if` / `else` branches — each branch has its own narrowed environment
- Early return guards — after `if (x === null) return;`, the code following the guard has `x: T` (non-null)
- `switch` cases on discriminant values
- Ternary expressions `cond ? a : b` — narrowed in each arm

At **join points** (merge of multiple control-flow paths), the type of a variable is the union of its types from all incoming paths:

```sjs
let y: string | number;
if (cond) {
  y = "hi";   // y: string here
} else {
  y = 42;     // y: number here
}
// join: y: string | number
```

**Loop bodies:** Types are widened back to the pre-loop type at the start of each iteration, because assignments within the loop body may run zero or more times.

---

## Type rules

### Null narrowing

```
Γ ⊢ x : T | null
─────────────────────────────── (narrow-null-true)
Γ, (x === null) ⊢ x : null

Γ ⊢ x : T | null
─────────────────────────────── (narrow-null-false)
Γ, (x !== null) ⊢ x : T
```

### `typeof` narrowing

```
Γ ⊢ x : T    "string" ∈ members(T)
──────────────────────────────────── (narrow-typeof-string-true)
Γ, (typeof x === "string") ⊢ x : string

Γ ⊢ x : T    "string" ∈ members(T)
──────────────────────────────────── (narrow-typeof-string-false)
Γ, (typeof x !== "string") ⊢ x : T \ string
```

### `instanceof` narrowing

```
Γ ⊢ x : T    C <: T
──────────────────────────────── (narrow-instanceof-true)
Γ, (x instanceof C) ⊢ x : C

Γ ⊢ x : T    C <: T
──────────────────────────────── (narrow-instanceof-false)
Γ, (x instanceof C) ⊢ x : T \ C
```

### `as` assertion

```
Γ ⊢ e : S    S <: T or T <: S
────────────────────────────── (as-assert)
Γ ⊢ (e as T) : T

Γ ⊢ e : S    S and T are unrelated (neither <: the other)
──────────────────────────────────────────────────────── (as-unrelated)
Γ ⊢ (e as T)  → SJS-E002
```

### Join point

```
Γ, branch-true ⊢ x : A    Γ, branch-false ⊢ x : B
──────────────────────────────────────────────────── (join)
Γ, after-if ⊢ x : A | B
```

---

## JS Lowering (Prototype)

All narrowing is type-level only. No runtime guards, tag checks, or type-testing code is generated by narrowing alone. `as` assertions are erased completely.

```sjs
// SJS input
function display(x: string | number): string {
  if (typeof x === "string") {
    return x.toUpperCase();
  }
  return x.toFixed(2);
}

const val: unknown = fetch();
const s = val as string;
```

```javascript
// JS output — as erased, narrowing adds no code
function display(x) {
  if (typeof x === "string") {
    return x.toUpperCase();
  }
  return x.toFixed(2);
}

const val = fetch();
const s = val;
```

---

## LLVM Lowering (Future)

Narrowing informs the compiler which LLVM type and instructions to use in each branch. A `typeof` check on a tagged union generates a `load` of the tag followed by a comparison; the narrowed branch then uses the appropriately typed payload accessor.

```llvm
; string | number narrowed by typeof x === "string"
%tag = extractvalue %sjs_union %x, 0
%is_str = icmp eq i8 %tag, 0    ; 0 = string tag
br i1 %is_str, label %str_branch, label %num_branch

str_branch:
  ; use %x as %sjs_string — extract payload as fat ptr
  ...
num_branch:
  ; use %x as double
  ...
```

`as` assertions between pointer-compatible types lower to a `bitcast`. `as` between value types of compatible size lower to a `bitcast` or are a no-op if representations match. `as unknown → T` lowering inserts a tag check in debug builds.

---

## Diagnostic codes

| Code | When emitted |
|------|--------------|
| `SJS-E002` | `as` assertion between types with no subtype relationship |
| `SJS-E003` | Property or method access on a value whose type has not been narrowed away from nullable or unknown |

---

## Examples

### Valid

```sjs
// ✓ Null check narrowing
function greet(name: string?): string {
  if (name === null) {
    return "Hello, stranger";
  }
  return "Hello, " + name.toUpperCase();  // name: string
}

// ✓ Early-return guard pattern
function process(x: number?): number {
  if (x === null) return 0;
  return x * 2;  // x: number
}

// ✓ typeof narrowing in union
function stringify(v: string | number | boolean): string {
  if (typeof v === "number") return v.toFixed(2);
  if (typeof v === "boolean") return v ? "yes" : "no";
  return v;  // v: string
}

// ✓ instanceof narrowing
function getMessage(e: Error | string): string {
  if (e instanceof Error) return e.message;
  return e;
}

// ✓ Discriminated union narrowing
type Msg = { type: "ping" } | { type: "data"; payload: string };
function handle(m: Msg): string {
  if (m.type === "ping") return "pong";
  return m.payload;  // m: { type: "data"; payload: string }
}

// ✓ as assertion — overlapping types
function coerce(x: unknown): string {
  return x as string;
}
```

### Invalid

```sjs
// ✗ SJS-E003: property access on unnarrowed nullable
function bad(name: string?): string {
  return name.toUpperCase();  // SJS-E003: name is string? — null check required
}

// ✗ SJS-E002: as between unrelated types
const n: number = 42;
const arr = n as string[];  // SJS-E002: number and string[] are unrelated

// ✗ <T>expr prefix form is banned
const s = <string>someValue;  // SJS-P001: use `someValue as string` instead
```


---

## 4. Code generation semantics {#4-codegen-semantics}

> **Grammar:** N/A (lowering rules) — see [`specs/grammar.ebnf`](./grammar.ebnf)  
> **Errors:** emit-time diagnostics only — see [`specs/error-codes.md`](./error-codes.md)

# 050 — JS Lowering (Prototype)

**Status:** Stage 1

---

## Overview

The JS prototype backend compiles `.sjs` source to standard JavaScript via two sequential passes:

1. **Type erasure pass** — removes all SJS-only type-level constructs. Output is syntactically valid JS with SJS extensions still intact.
2. **Syntax transform pass** — lowers SJS runtime constructs (sum type constructors, `match`, JSX, constructor parameter properties) to plain JS.

The final output targets the JavaScript version specified by `--target` (`es5` / `es2015` / `es2022` / `esnext`). Lower targets apply additional Babel-style transforms. Source maps are produced throughout; see `054-source-maps.md`.

---

## Type Erasure Pass

All type-level syntax is removed. The resulting AST is structurally identical to TypeScript after erasure.

| SJS construct | JS output |
|---|---|
| `: T` annotation on variable / parameter / return | removed |
| `type I {}` object-type declaration (brace form) | removed entirely |
| `type X = ...` alias | removed entirely |
| `import type { }` / `export type { }` | removed entirely |
| `abstract` modifier on class or method | removed |
| `public` / `private` / `protected` access modifier | removed (does NOT affect `#field` — see below) |
| `readonly` modifier | removed |
| `declare ...` ambient declaration | removed |
| `<T>` type parameter list on function / class / method | removed |
| `expr as T` type assertion | `expr` (assertion removed, expression kept) |
| `T?` nullable shorthand annotation | annotation removed |
| `[key: string]: T` index signature in object type / object | removed |
| Non-null assertion suffix `!` | forbidden (SJS-E011 before erasure) |

Note: `private` keyword (access modifier) is removed. The JS private-field syntax `#field` is **not** a modifier — it is a distinct identifier form and is preserved as-is.

---

## Syntax Transform Pass

SJS runtime constructs are lowered to object literals, IIFEs, and standard JS syntax.

| SJS construct | JS output |
|---|---|
| `type Result<T,E> = Ok(T)\|Err(E)` declaration | removed (type-level — no runtime output) |
| `Ok(42)` tuple variant constructor | `{ _tag: "Ok", _0: 42 }` |
| `None` unit variant constructor | `{ _tag: "None" }` |
| `Circle({ radius: 5 })` record variant constructor | `{ _tag: "Circle", radius: 5 }` |
| `Pair(a, b)` two-field tuple variant | `{ _tag: "Pair", _0: a, _1: b }` |
| `match expr { Ok(v) => body }` | IIFE with `_tag` equality checks (see `053-match-lowering.md`) |
| `Ok` used as higher-order value `arr.map(Ok)` | `arr.map(v => ({ _tag: "Ok", _0: v }))` |
| `import type { … }` | erased entirely (no import emitted) |
| JSX `<Foo p={v} />` | `React.createElement(Foo, { p: v })` |
| JSX fragment `<>…</>` | `React.createElement(React.Fragment, null, …)` |
| Constructor parameter property `constructor(public x: T)` | `this.x = x` assignment emitted in constructor body |
| `for (const x: T of arr)` | `for (const x of arr)` (type annotation dropped) |

Variant constructors are inlined as object literals — no helper functions are generated. When a constructor is used as a first-class callback (not directly applied), a wrapping arrow function is emitted. See `052-sum-type-encoding.md`.

---

## Target-Specific Transforms

After type erasure and syntax transforms, a target-specific pass lowers language features to the ES level required by `--target`.

| Feature | `es5` | `es2015` | `es2022` | `esnext` |
|---|---|---|---|---|
| Classes | Prototype-chain constructors + `Object.create` | Native `class` | Native `class` | Native `class` |
| Arrow functions | `function` expressions (with `this` binding fix) | Native arrows | Native arrows | Native arrows |
| `async` / `await` | Promise-chain rewrite | Promise-chain rewrite | Native (requires target ≥ es2017) | Native |
| Generators `function*` | `regenerator-runtime` polyfill | Native generators | Native generators | Native generators |
| `let` / `const` | `var` (with block-scope rename for conflicts) | Native | Native | Native |
| Template literals `` `…` `` | String concatenation | Native | Native | Native |
| `?.` optional chaining | Conditional expression with `null` check | Conditional expression | Native (requires target ≥ es2020) | Native |
| `??` nullish coalescing | `value != null ? value : fallback` | `value != null ? value : fallback` | Native (requires target ≥ es2020) | Native |
| `**` exponentiation | `Math.pow(base, exp)` | `Math.pow(base, exp)` | Native (requires target ≥ es2016) | Native |
| Destructuring | Manual extraction with temp variables | Native | Native | Native |
| Spread / rest `...` | `Array.prototype.slice` / `.apply` | Native | Native | Native |
| `for…of` | Index loop or iterator protocol via `Symbol.iterator` | Native | Native | Native |
| Private fields `#field` | WeakMap backing map per class | WeakMap backing map per class | Native | Native |

The `esnext` target passes through all constructs that the JS engine is expected to support natively. No polyfills are injected — the consumer is responsible for runtime environment compatibility.

---

## Diagnostics

None. The lowering pass runs after all type errors have been resolved. Internal lowering failures are compiler bugs, not user-facing diagnostics.


# 051 — LLVM Lowering (Future)

**Status:** Stage 2+

---

## Overview

The LLVM backend compiles fully-annotated SJS (Phase 3 — no unannotated positions, no `dynamic` without an explicit narrowing tag) to LLVM IR 17. Each `.sjs` file produces one LLVM module. Generic types are monomorphized: every unique instantiation of `f<T>` or `Container<T>` produces a concrete LLVM function or struct with the type parameters substituted. No polymorphic dispatch through type erasure.

**Memory model:**
- v1: arena allocator. Objects are never individually freed. Suitable for short-lived compiler, CLI, and server processes with bounded allocation. No GC pauses.
- v2: precise moving GC with per-type maps generated at compile time. Required for long-lived processes and data-structure-heavy programs.

---

## Type → LLVM IR Mapping

| SJS type | LLVM IR type | Notes |
|---|---|---|
| `number` | `double` | IEEE 754 64-bit float |
| `string` | `%SjsString = type { i8*, i64, i64 }` | ptr, len, cap; short-string optimization (SSO) for ≤15 bytes stores inline |
| `boolean` | `i1` (register), `i8` (memory) | widened to `i8` when stored in structs for alignment |
| `bigint` | `%SjsBigInt = type { i32*, i32, i8 }` | digits array, len, sign byte; GMP-compatible layout |
| `symbol` | `%SjsSymbol = type { i8*, i64 }` | description_ptr, unique_id (monotonic counter) |
| `null` | pointer-typed `null` or sentinel `i8* null` | depends on context: null pointer when T is a pointer type |
| `undefined` | sentinel `i8* @sjs_undef_sentinel` | static global; pointer comparison |
| `void` | LLVM `void` | return type only; cannot be stored |
| `never` | function attributed `noreturn`; body ends with `unreachable` | callers may omit successor block |
| `unknown` | `%SjsDynamic` (same representation as `dynamic`) | must be narrowed before any operation |
| `dynamic` | `%SjsDynamic = type { i8, [8 x i8] }` | 1-byte tag + 8-byte payload union; see `004-dynamic.md` |
| `T?` nullable | `{ i1, T }` tagged struct, OR null pointer when T is a pointer type | tagged-struct form used for scalar T |
| `T[]` array | `%SjsArray_T = type { T*, i64, i64 }` | data ptr, len, cap; monomorphized per T |
| `[A, B]` tuple | `{ A, B }` | fields in declaration order; stack-allocated by default |
| `(P) => R` function type | `R (*)(P)` function pointer; closure = `{ R(*)(P, %env*), %env* }` fat pointer | |
| `{ k: T }` object type | `%Struct_name = type { T, ... }` | fields in declaration order; name mangled from type shape |
| Sum type | `{ i8, [N x i8] }` | tag byte + payload union sized to largest variant |

---

## Key Lowering Patterns

### Functions

```llvm
define double @double(double %n) {
entry:
  %result = fmul double %n, 2.0
  ret double %result
}
```

Type annotations are erased before LLVM emission. Parameter and return types come from the monomorphized signature.

### Closures

A closure is a fat pointer: a function pointer plus an environment pointer. The environment struct captures all free variables by value (or by pointer for mutable captures).

```llvm
; function add(x: number): (number) => number
%Closure_add_env = type { double }          ; captured: x
%Closure_add     = type { double (double, %Closure_add_env*)*, %Closure_add_env* }

define double @add_inner(double %y, %Closure_add_env* %env) {
  %x = load double, double* getelementptr(%Closure_add_env, %Closure_add_env* %env, 0, 0)
  %sum = fadd double %x, %y
  ret double %sum
}
```

### Nullable check (`T?`)

```llvm
; if (value != null) { ... }
%is_null = icmp eq i8 %tag, 0          ; tag 0 = null
br i1 %is_null, label %null_branch, label %value_branch
```

### Interface dispatch (vtable)

Interfaces compile to vtable structs. Each interface method becomes a function pointer slot. Values implementing the interface are fat pointers: `{ vtable*, data* }`.

```llvm
%AnimalVtable = type { void (%AnimalData*)* }   ; one slot: speak()
%Animal       = type { %AnimalVtable*, i8* }     ; vtable ptr + opaque data ptr

; Dispatch: animal.speak()
%vtable_ptr = extractvalue %Animal %animal, 0
%speak_slot = getelementptr %AnimalVtable, %AnimalVtable* %vtable_ptr, 0, 0
%speak_fn   = load void(%AnimalData*)*, void(%AnimalData*)** %speak_slot, align 8
%data_ptr   = extractvalue %Animal %animal, 1
%data_typed = bitcast i8* %data_ptr to %AnimalData*
call void %speak_fn(%AnimalData* %data_typed)
```

### Monomorphization

Each unique instantiation of a generic function or type is emitted as a distinct LLVM function or struct. The compiler maintains a monomorphization cache keyed on `(generic_name, [concrete_types…])`. Duplicate instantiations across modules are de-duplicated at link time via `linkonce_odr`.

### Memory (v1 arena)

```llvm
declare i8* @sjs_arena_alloc(i64 %size, i64 %align)

; Allocate a %Shape on the arena
%raw = call i8* @sjs_arena_alloc(i64 ptrtoint(%Shape* getelementptr(%Shape, null, 1) to i64), i64 8)
%ptr = bitcast i8* %raw to %Shape*
```

---

## Diagnostics

None. LLVM lowering is post-type-check. Failures during IR generation are internal compiler errors, not user-facing diagnostic codes.


# 052 — Sum Type Runtime Encoding

**Status:** Stage 0 — authoritative

---

## Overview

This document is the authoritative specification for the runtime representation of sum type values in both the JS prototype backend and the LLVM backend. All code generation, pattern matching, and runtime reflection must conform to this encoding. Cross-referenced by `002-sum-types.md` and `003-match.md`.

---

## JS Encoding

Sum type values are plain JavaScript objects. Every value carries a mandatory `_tag` property that identifies the variant. Payload fields follow a fixed naming convention determined by the variant form.

### Unit variant `| None`

No payload fields. The object contains only `_tag`.

```javascript
{ _tag: "None" }
```

### Tuple variant `| Ok(T)`

Single positional payload stored under key `_0`.

```javascript
{ _tag: "Ok", _0: value }
```

Multiple tuple fields `| Pair(A, B)`:

```javascript
{ _tag: "Pair", _0: firstValue, _1: secondValue }
```

Positional keys `_0`, `_1`, `_2`, … continue for as many fields as declared.

### Record variant `| Circle { radius: number }`

Each declared field name is used directly as an object key. No `_0` key is present.

```javascript
{ _tag: "Circle", radius: 5 }
```

Multi-field record `| Rect { width: number, height: number }`:

```javascript
{ _tag: "Rect", width: 10, height: 4 }
```

---

## `_tag` Invariants

- Type: always a `string`, never a number or symbol.
- Value: the exact variant name as declared in the `type` definition — case-sensitive, no transformation.
- Position: `_tag` must be the **first** property. V8 and SpiderMonkey optimize property access on consistent object shapes ("hidden classes"); placing `_tag` first ensures the discriminant check hits the fastest path.
- Payload keys: `_0`, `_1`, … for tuple variants; field names for record variants; absent for unit variants.
- Frozen: objects are NOT frozen by default. The `--frozen-tags` compiler option wraps each constructor output in `Object.freeze(…)`, enabling stricter immutability guarantees at a small runtime cost.
- Prototype: `Object.prototype` (plain object literal). No custom prototype chain.

---

## Constructor Inlining

Variant constructors are **not** emitted as helper functions. Each constructor expression is lowered to an inline object literal at the call site. This enables:

- Dead-code elimination: an unused `Ok(42)` is eliminated without a function-call side-effect barrier.
- Engine shape specialization: inline literals give the JS engine full visibility into object shape.
- Zero call overhead: no function dispatch.

```sjs
// SJS
const r: Result<number, string> = Ok(42);
```

```javascript
// JS — inlined, no helper function
const r = { _tag: "Ok", _0: 42 };
```

**Exception — higher-order use.** When a constructor is used as a first-class value (passed as a callback or stored in a variable without immediate application), the compiler wraps it in an arrow function:

```sjs
// SJS
const values = arr.map(Ok);
```

```javascript
// JS — arrow wrapper emitted
const values = arr.map(v => ({ _tag: "Ok", _0: v }));
```

Multi-field tuple constructor used as callback:

```javascript
arr.map((a, b) => ({ _tag: "Pair", _0: a, _1: b }));
```

The compiler detects higher-order use by checking whether the constructor expression appears in a non-call-expression position (argument to another call, right-hand side of assignment without immediate invocation, etc.).

---

## LLVM Encoding

In LLVM IR, sum type values are tagged unions. The tag is an `i8` (supports up to 255 variants per type). The payload is a byte array sized to the largest variant's concrete payload. Tag values are assigned in variant declaration order starting at 0 and are stable across compilations.

```llvm
; type Result<number, string>  (monomorphized)
; Variants: Ok(double)=0, Err(%SjsString)=1
; sizeof double = 8 bytes; sizeof %SjsString = { i8*, i64, i64 } = 24 bytes
; payload size = max(8, 24) = 24

%Result_f64_str = type {
  i8,           ; _tag: 0 = Ok, 1 = Err
  [24 x i8]     ; payload union
}
```

### Constructing `Ok(42.0)`

```llvm
%result = alloca %Result_f64_str, align 8
%tag_ptr     = getelementptr %Result_f64_str, %Result_f64_str* %result, 0, 0
store i8 0, i8* %tag_ptr                       ; tag = 0 (Ok)
%payload_ptr = getelementptr %Result_f64_str, %Result_f64_str* %result, 0, 1
%f64_ptr     = bitcast [24 x i8]* %payload_ptr to double*
store double 42.0, double* %f64_ptr
```

### Constructing `Err("not found")`

```llvm
store i8 1, i8* %tag_ptr                       ; tag = 1 (Err)
%str_ptr = bitcast [24 x i8]* %payload_ptr to %SjsString*
; ... initialize SjsString fields (ptr, len, cap)
```

### Tag assignment policy

Tags are assigned `0, 1, 2, …` in the order variants appear in the `type` declaration. This assignment is deterministic and stable: recompiling the same source always produces the same tag values. Adding a new variant to the end of a sum type increments the maximum tag but does not change existing tag values.

Removing or reordering variants is a breaking change requiring a full recompile of all dependents.

---

## Diagnostics

None. The encoding is a compiler implementation detail, not directly observable by user code. Violations produce internal compiler errors, not SJS diagnostic codes.


# 053 — Match Expression Lowering

**Status:** Stage 0

---

## Overview

This document specifies how `match` expressions are lowered to JS (prototype backend) and LLVM IR (future backend). Cross-referenced by `003-match.md`. For the `_tag`-based encoding that match dispatch depends on, see `052-sum-type-encoding.md`.

---

## JS Lowering Algorithm

A `match` expression is lowered to an immediately-invoked arrow function (IIFE). This is necessary because `match` is an expression — it must produce a value — and `if`/`return` sequences require a function boundary.

**Subject evaluation:** the subject expression is assigned to a single temp variable `$m`. This ensures the subject is evaluated exactly once, regardless of how many arms reference it. This is critical for side-effectful subjects (function calls, increments, etc.).

**IIFE template:**

```javascript
const $result = (() => {
  const $m = <subject_expression>;
  // ... arm dispatch ...
  throw new Error("[SJS] Non-exhaustive match");
})();
```

The trailing `throw` is a compile-time-dead sentinel. It is emitted in all cases except when a `default` or binding arm is present (which statically guarantees a match). An exhaustive match verified by SJS-E007 will never reach this throw at runtime.

### Arm dispatch by pattern kind

**Tuple variant `Ok(v)`** — tests `_tag`, binds `_0`:

```javascript
if ($m._tag === "Ok") { const v = $m._0; return <body>; }
```

**Multi-field tuple `Pair(_0, _1)`:**

```javascript
if ($m._tag === "Pair") { const a = $m._0; const b = $m._1; return <body>; }
```

**Record variant `Rect({ width, height })`** — tests `_tag`, destructures fields:

```javascript
if ($m._tag === "Rect") { const { width, height } = $m; return <body>; }
```

Record variant with field rename `Click({ x: cx, y: cy })`:

```javascript
if ($m._tag === "Click") { const { x: cx, y: cy } = $m; return <body>; }
```

**Unit variant `None`** — tests `_tag` only:

```javascript
if ($m._tag === "None") { return <body>; }
```

**Literal `42` or `"hello"`** — strict equality check:

```javascript
if ($m === 42) { return <body>; }
```

**Binding pattern `other`** — always matches, introduces binding:

```javascript
{ const other = $m; return <body>; }
```

No `if` guard. Must not be a known variant name in scope (resolved at type-check time).

**`default` wildcard** — always matches, no binding:

```javascript
return <body>;
```

No `if` guard. Must appear last (enforced by the exhaustiveness check and parser).

### Block body arms

When an arm body is a `BlockStatement`, the final expression is lifted to a `return`:

```sjs
match x {
  Ok(v) => {
    const doubled = v * 2;
    doubled + 1
  },
  Err(e) => 0,
};
```

```javascript
(() => {
  const $m = x;
  if ($m._tag === "Ok") {
    const v = $m._0;
    const doubled = v * 2;
    return doubled + 1;
  }
  if ($m._tag === "Err") { const e = $m._0; return 0; }
  throw new Error("[SJS] Non-exhaustive match");
})()
```

The last statement in a block arm that is an expression statement is rewritten to `return <expr>`. If the block ends with a `return` statement, no rewrite is needed.

---

## LLVM Lowering

Match expressions compile to a `switch` instruction on the `_tag` i8 field. Each arm becomes a labeled basic block. The final match value is collected via a `phi` node at the merge point.

```llvm
; match result { Ok(v) => v * 2.0, Err(e) => -1.0 }
; Assume: Ok = tag 0, Err = tag 1

%tag = extractvalue %Result_f64_str %result, 0
switch i8 %tag, label %exhaustiveness_trap [
  i8 0, label %arm_ok
  i8 1, label %arm_err
]

arm_ok:
  %payload_ok  = extractvalue %Result_f64_str %result, 1
  %f64_ptr     = bitcast [24 x i8] %payload_ok to double
  %arm_ok_val  = fmul double %f64_ptr, 2.0
  br label %match_exit

arm_err:
  ; string payload extraction omitted for brevity
  br label %match_exit

exhaustiveness_trap:
  ; unreachable in exhaustive matches — type-checker guarantees coverage
  ; retained in debug builds for crash diagnostics
  ; optimized away (dead block) in release builds
  unreachable

match_exit:
  %match_result = phi double [ %arm_ok_val, %arm_ok ], [ -1.0, %arm_err ]
```

For record variants, field extraction uses a typed pointer cast on the payload byte array:

```llvm
; arm for Rect({ width, height }) where %RectPayload = type { double, double }
arm_rect:
  %payload     = extractvalue %Shape %subject, 1
  %rect_ptr    = bitcast [16 x i8] %payload to %RectPayload*
  %width       = load double, double* getelementptr(%RectPayload, %RectPayload* %rect_ptr, 0, 0)
  %height      = load double, double* getelementptr(%RectPayload, %RectPayload* %rect_ptr, 0, 1)
  %area        = fmul double %width, %height
  br label %match_exit
```

---

## Optimizations

| Condition | Optimization applied |
|---|---|
| Subject is a pure load (no side effects) | Temp `$m` / alloca elided; subject referenced directly |
| All arms covered (exhaustive) | `exhaustiveness_trap` / `throw` block is dead code; removed by optimizer |
| Single-arm match (one variant type) | Degenerates to a direct `_tag` check + extract — no switch or IIFE overhead |
| Large match (> 4 arms, LLVM) | Compiler annotates `switch` with `branch_weights` to prefer the statistically hot arm; backends may emit a jump table |
| Literal-only match | LLVM backend uses `switch` on the value directly (no tag) |

---

## Diagnostics

None. Match lowering runs after SJS-E007 (exhaustiveness) and SJS-W003 (unreachable arm) have been resolved. Lowering failures are internal compiler errors.


# 054 — Source Map Fidelity

**Status:** Stage 1
**Grammar:** `specs/grammar.ebnf` (not applicable — output format specification)

---

## Overview

Every `.sjs` → `.js` compilation must produce a source map that maps each generated JS token back to its originating position in the `.sjs` source. Diagnostics, stack traces, and debugger step-through always display `.sjs` positions — generated `.js` positions are never surfaced to the user.

---

## Source Map Format

| Property | Value |
|---|---|
| Spec version | Source Map v3 (https://sourcemaps.info/spec.html) |
| File location | External file `<output>.js.map` (never inline `data:` URL) |
| Footer in output JS | `//# sourceMappingURL=<output>.js.map` (last line of file) |
| `version` field | `3` |
| `file` field | Output JS filename (basename only) |
| `sources` field | Array of `.sjs` source paths, relative to the project root |
| `sourcesContent` field | Omitted — avoids duplicating source in the map; IDE fetches source on demand |
| `names` field | Optional; included when identifier renaming occurs (e.g., scope-collision rename during `let`→`var` transform) |
| `mappings` field | VLQ-encoded segment map; every generated token must have a mapping segment |

The compiler must not embed absolute host paths in `sources`. Paths are relative to the project root (directory containing `superjs.config.json`).

---

## Position Mapping Rules

| SJS construct | Source map behavior |
|---|---|
| `: T` type annotation | Annotation erased — no mapping segment generated for the annotation site |
| `T?` nullable annotation | Annotation removed — no mapping segment |
| `Ok(42)` → `{ _tag: "Ok", _0: 42 }` | Generated object literal spans map back to the `Ok(42)` call-expression start in `.sjs` |
| `match` expression braces | Opening `{` of IIFE maps to the `match` keyword position in `.sjs` |
| `match` arm body | Each arm body expression / block maps to the corresponding arm expression start in `.sjs` |
| `import type { … }` | Erased — no mapping segment |
| `interface` / `type` declaration | Erased — no mapping segment |
| Inline JSX `<Foo />` | Maps to the JSX element opening tag position (`<`) in `.sjs` |
| Arrow function `=>` | Generated `=>` maps to SJS `=>` position |
| Constructor parameter property `constructor(public x: T)` | Generated `this.x = x` maps to the parameter position `x` in `.sjs` |
| `for (const x: T of arr)` → `for (const x of arr)` | Loop token maps to `for` keyword in `.sjs` |
| ES5 class → prototype chain | Each method definition maps to the corresponding SJS method position |

The rule for erased constructs is: if no JS token is emitted, no source map segment is emitted. Segments must never point to positions that have been erased.

---

## Determinism Requirement

Two compilations of identical `.sjs` source with identical config and flags must produce:

1. Byte-for-byte identical JS output.
2. Byte-for-byte identical source map.

Non-determinism sources that must be eliminated:

| Source | Fix |
|---|---|
| `.tsbuildinfo` files containing absolute host paths | Must be `.gitignore`d; never committed |
| Non-deterministic object property enumeration order | Use sorted key iteration throughout the compiler |
| Timestamps or process IDs embedded in output | Forbidden in any output file |
| File system directory enumeration order | Sort input file lists before processing |
| Hash-map iteration order for module graphs | Use sorted adjacency lists |

CI enforcement: `scripts/check-determinism.mjs` compiles each `.sjs` file twice in separate processes, then diffs the outputs. Any difference causes a CI failure. This script runs in the `verify` stage of the pipeline before the `test` stage.

---

## Error Position Format

All SJS diagnostics report positions in the `.sjs` source file, never the generated `.js` file:

```
src/app.sjs:12:5: SJS-E001: null is not assignable to type 'string'
```

Format: `<file>:<line>:<col>: <CODE>: <message>`

| Field | Description |
|---|---|
| `file` | Path to the `.sjs` source, relative to project root |
| `line` | 1-based line number in the `.sjs` file |
| `col` | 1-based column number (byte offset, 1-indexed) in the `.sjs` file |
| `CODE` | Diagnostic code: `SJS-E`, `SJS-W`, `SJS-L`, or `SJS-P` followed by a zero-padded number |
| `message` | Human-readable description of the issue |

When a diagnostic spans multiple lines (e.g., an unclosed block), the position refers to the start of the construct. The compiler may optionally include an end position as `file:line:col-endcol` for single-line spans.

Stack traces from runtime errors (in development builds with source-map support enabled) are remapped to `.sjs` positions via the `source-map` npm package or Node's built-in `--enable-source-maps` flag.

---

## Diagnostics

None. Source map generation is a post-compilation step. Failures during map generation are internal compiler errors (`[SJS internal]` prefix), not user-facing diagnostic codes.


---

## 5. CLI surface {#5-cli-surface}

> **Grammar:** N/A — see [`specs/grammar.ebnf`](./grammar.ebnf)  
> **Errors:** CLI exit codes; compiler diagnostics — see [`specs/error-codes.md`](./error-codes.md)

# CLI Surface

**Status:** v1.0  
**Implementation:** `superjs/apps/cli` (`@superjs/cli`)  
**Grammar:** N/A  
**Errors:** non-zero exit when diagnostics contain errors; see `specs/error-codes.md`

---

## Overview

The `superjs` CLI is the primary batch interface for check, build, format, lint,
documentation generation, and project scaffolding.

## Commands

| Command | Purpose |
|---------|---------|
| `superjs check [paths…]` | Type-check `.sjs` files; exit 1 on errors |
| `superjs build` | Emit JavaScript per `superjs.config.json` |
| `superjs watch` | Watch mode for `check` / `build` |
| `superjs format [paths…]` | Format sources (idempotent) |
| `superjs lint [paths…]` | Run lint rules (`SJS-L*`); `--fix` for auto-fixes |
| `superjs verify` | Validate config + diagnostic fixtures |
| `superjs docgen` | Generate API docs from `doc()` comments |
| `superjs lsp` | Start language server (stdio) |
| `superjs init <template>` | Scaffold project (`workers-api`, `lambda-handler`, …) |
| `superjs migrate from-prototype` | Rewrite prototype syntax to v1.0 SJS |

## Configuration

`superjs.config.json` schema: `specs/config-schema.json`. Key fields:

- `strict` — warnings as errors
- `sourceMap` — `none` | `inline` | `external`
- `paths` — module path mapping
- `lint` — per-rule severity overrides

## Exit codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Compile / check errors |
| 2 | Invalid arguments or config |

## Relationship to tooling spec

LSP, linter, and formatter semantics are normatively defined in
`009-tooling-surface.md` (Chapter 8). This file covers only the CLI command
surface and configuration contract.


---

## 6. Incremental compilation model {#6-incremental-model}

> **Grammar:** N/A — see [`specs/grammar.ebnf`](./grammar.ebnf)  
> **Errors:** N/A — see [`specs/error-codes.md`](./error-codes.md)

# Incremental Compilation Model

**Status:** v1.0  
**Implementation:** `@superjs/compiler` (`superjs/libs/compiler/src/lib/hash.ts`, `Compiler` session)  
**Errors:** cache misses are transparent; stale analysis may emit `SJS-E*` on re-check

---

## Overview

The SuperJS compiler supports incremental reuse of parse, check, and emit results
via content-addressed cache keys. File modification time is **not** used — only
source text, compiler version, and canonicalised config.

## Cache key components

```
cacheKey = SHA-256( fileHash(source) + COMPILER_VERSION + configHash(opts) )
```

| Component | Function | Invalidates when |
|-----------|----------|------------------|
| `fileHash` | SHA-256 of source text | Any character changes |
| `COMPILER_VERSION` | Compiler semver stamp | Compiler upgrade |
| `configHash` | Canonical JSON of compile options | `variants`, `sourceMap`, `jsx`, `strict`, `paths`, … |

## API surface hashes

- **`apiHash`** — SHA-256 of sorted exported signatures. Downstream importers
  re-type-check only when a dependency's public API changes, not private internals.
- **`docHash`** — SHA-256 of documentation comment blocks. Invalidates LSP hover
  and docgen caches without triggering a full re-check.

## Session model

`configureSession`, `openFile`, `closeFile`, `typeAt`, `symbolAt`, and
`diagnosticsFor` operate on a process-wide compiler session (LSP uses one session
per server instance). `transform()` for build plugins uses ephemeral sessions.

## CLI commands

| Command | Incremental behaviour |
|---------|----------------------|
| `superjs check` | Full-project check; may use disk cache when enabled in config |
| `superjs build` | Per-file transform with cache store from `superjs.config.json` |
| `superjs watch` | Re-runs check/build on file change events |
| `superjs verify` | Validates config + fixture diagnostics (no incremental emit) |

## LSP integration

`textDocument/didChange` replaces the full document text and invalidates that
file's cache entry. `lsp.memoryBudgetMB` (default 128) bounds the number of open
documents; LRU eviction drops cold files from the session.

## Invariants

1. Identical `(source, version, config)` must produce bit-identical emit (modulo
   non-deterministic source-map URL fields).
2. Cache entries must not survive `COMPILER_VERSION` bumps.
3. `docHash` changes must not alone invalidate type-check results.


---

## 7. Interop with TypeScript {#7-interop}

> **Grammar:** N/A — see [`specs/grammar.ebnf`](./grammar.ebnf)  
> **Errors:** SJS-W001, SJS-W002, SJS-E002 — see [`specs/error-codes.md`](./error-codes.md)

# Interop with TypeScript

**Status:** v1.0  
**Implementation:** `@superjs/interop`, `@superjs/types-*` wrappers (WS-B3)  
**Errors:** `SJS-W001`–`SJS-W002` on `dynamic` boundaries; `SJS-E002` on unsafe assignments

---

## Overview

SuperJS interoperates with existing TypeScript and JavaScript ecosystems via:

1. **`.d.ts` → `.d.sjs` translation** (`translateDts` in `@superjs/interop`)
2. **Hand-curated `@superjs/types-*` packages** for popular npm libraries
3. **`dynamic` at FFI boundaries** with narrowing before typed use

## `dynamic` escape hatch

Values from untyped JS use the `dynamic` type (`004-dynamic.md`). Assigning
`dynamic` to a concrete type without narrowing emits `SJS-W002` (error in
`--strict`).

## Markers

| Marker | Effect |
|--------|--------|
| `// @sjs:dynamic` | Next line/binding treated as intentionally `dynamic` |
| `// @sjs:dynamic-ok` | Suppresses `SJS-L013` (no-explicit-dynamic) for annotated positions |

## `.d.ts` translation

`translateDts(path)` parses TypeScript declaration files with the TypeScript
compiler API and emits SuperJS type declarations via `emitTypeDecl`. Banned TS
constructs (`enum`, mapped types, `any`) are rejected or mapped to SJS equivalents
(`any` → `dynamic`, `enum` → sum type sketch).

## Wrapper resolution order

When importing an npm package:

1. If `@superjs/types-<pkg>` exists, use its `.sjs` declarations.
2. Else if a project-local `.d.sjs` exists, use it.
3. Else fall back to `dynamic` for the module namespace (`SJS-W001` in strict mode).

## `fromJS` / `toJS` (runtime)

Runtime boundary helpers live in `@superjs/runtime` (Tier 4). They perform
shallow structural checks before crossing the `dynamic` ↔ typed boundary.
Incorrect shapes throw at runtime — prefer `std-schema` validators for untrusted input.

## Migration tooling

`superjs migrate from-prototype` rewrites prototype syntax to v1.0 SJS (see
`docs/migration/`). Interop wrappers are not modified by the migrator.


---

## 8. Tooling surface {#8-tooling-surface}

> **Grammar:** N/A — see [`specs/grammar.ebnf`](./grammar.ebnf)  
> **Errors:** SJS-L001–SJS-L018, SJS-F* — see [`specs/error-codes.md`](./error-codes.md)

# Tooling Surface (B8)

Semantics of the SuperJS developer-tooling surface: the language server's
methods, the linter's rules, and the formatter's invariants. This consolidates
the contracts the CLI, LSP, and editor integrations depend on.

## Language server (`@superjs/lsp`, `superjs lsp`)

A standard LSP server over stdio. Each server owns an isolated compiler session;
text-sync notifications drive that session and republish diagnostics.

### M1 methods

| Method | Semantics |
|--------|-----------|
| `initialize` / `initialized` / `shutdown` / `exit` | Lifecycle. `exit` returns code 0 only if `shutdown` preceded it. |
| `textDocument/didOpen` / `didChange` / `didClose` | Full-document text sync; each edit re-checks and republishes diagnostics. `didClose` clears them. |
| `textDocument/publishDiagnostics` | Compiler diagnostics, with SJS spans (1-based line) mapped to LSP ranges (0-based) and severities to `DiagnosticSeverity`. |
| `textDocument/hover` | Type under the cursor, rendered via the checker's `display`, as a `sjs` markdown block. |
| `textDocument/definition` | Declaration site of the identifier under the cursor (in-file). |
| `textDocument/documentSymbol` | Outline of top-level declarations with `SymbolKind`; full decl as `range`, identifier as `selectionRange`. |
| `textDocument/foldingRange` | Every top-level declaration spanning more than one line. |
| `textDocument/completion` | Local declarations + keywords + primitive type names (position-insensitive at MVP). |
| `textDocument/signatureHelp` | Callee signature + active parameter (top-level comma count) when inside a call. |
| `textDocument/semanticTokens/full` | Lexer-driven token classification (keyword / string / number / variable). |
| `textDocument/formatting` | A whole-document edit via the safe formatter, or no edits when already canonical. |

### M2 methods

| Method | Semantics |
|--------|-----------|
| `textDocument/references` | Every same-name identifier occurrence (single document) as a `Location`. |
| `textDocument/documentHighlight` | The same occurrences as `Text` highlights. |
| `textDocument/rename` | A `WorkspaceEdit` replacing every occurrence with the new name. |
| `textDocument/codeAction` | Quick fixes drawn from lint findings carrying an auto-fix, as `quickfix` actions. |
| `textDocument/inlayHint` | Inferred-type hints after un-annotated `const`/`let` bindings. |

References / rename match by name within a single document (the v1.0 model);
cross-file and scope-precise resolution are post-v1.0.

### Memory budget (M6)

The source/AST cache is bounded by `lsp.memoryBudgetMB` (default 128 MB; set via
`initializationOptions`). When the cache exceeds the budget, the
least-recently-touched document is evicted (re-added on its next edit), so a long
multi-file session does not grow without bound.

## Linter (`superjs lint`)

17 rules, each emitting a registry diagnostic (`SJS-L*`). `--fix` applies the
auto-fixes that rules declare (right-to-left, skipping overlaps).

| Code | Rule | Notes |
|------|------|-------|
| SJS-L001 | prefer-const | `let` never reassigned. |
| SJS-L002 | no-var | auto-fix → `let`. |
| SJS-L003 | eqeqeq | `==` / `!=`. |
| SJS-L004 | no-for-in | prefer `for…of`. |
| SJS-L005 | no-debugger | auto-fix removes the statement. |
| SJS-L006 | no-empty-match | a `match` with no arms. |
| SJS-L007 | no-redundant-match-arm | a variant handled twice. |
| SJS-L008 | prefer-arrow-callback | anonymous `function` expression as a call argument. |
| SJS-L009 | no-unused-import | import binding referenced nowhere. |
| SJS-L010 | import-order | sources sorted within an import block. |
| SJS-L012 | no-unused-var | non-exported top-level binding referenced nowhere. |
| SJS-L013 | no-explicit-dynamic | explicit `dynamic`; opt out with `// @sjs:dynamic-ok`. |
| SJS-L014 | no-shadowing | binding shadowing an enclosing scope. |
| SJS-L015 | no-floating-promise | `Promise`-typed expression statement (type-aware). |
| SJS-L016 | no-unhandled-result | `Result`-typed expression statement (type-aware). |
| SJS-L017 | prefer-result-over-throw | a `throw` statement (RFC-0004). |
| SJS-L018 | no-mixed-spaces-tabs | mixed leading indentation. |

(`SJS-L011` is a Stage-1 lexer security diagnostic, not a style rule.) The
type-aware rules (L015/L016) run a type-check pass and inspect the synthesized
type at each expression statement; on any checker failure they yield no findings.

`no-non-null-assertion` from earlier plans is **not applicable** — the postfix
`!` non-null assertion is a banned construct in SJS (see `007-banned-features.md`).

## Formatter (`superjs format`)

Invariants:

- **Safe by construction.** The formatter re-parses its own output and only
  rewrites a file when the result is provably the same program (AST-equal,
  ignoring spans). Anything it can't reproduce faithfully is left unchanged.
- **Idempotent.** `format(format(x)) === format(x)` for every input; the second
  pass reports `changed: false`.
- **Whitespace-invariant.** Formatting is stable under input whitespace
  variation (verified by a property test).
- **Fast.** Well under the 50 ms budget on a 1,000-line file.

`.sjsignore` (gitignore-style) excludes files from directory walks across
`format` / `lint` / `check` / `build` / `doc`; explicitly-named files are always
processed. See `specs/design/formatter-integration.md` for the syntax and the
Prettier / Husky coexistence story.


---

## 9. Standard library {#9-stdlib}

> **Grammar:** N/A — see [`specs/grammar.ebnf`](./grammar.ebnf)  
> **Errors:** SJS-L016 (unhandled Result) — see [`specs/error-codes.md`](./error-codes.md)

# Standard Library Surface

**Status:** v1.0 stable surface  
**Source:** `superjs/libs/stdlib/src/modules/*.sjs` → `@superjs/std-*` packages  
**Errors:** stdlib uses `Result<T,E>`; callers should handle `Err` arms (`SJS-L016` warns on unhandled `Result`)

---

## Overview

The v1.0 standard library is authored in SuperJS and compiled to JavaScript.
Each module maps to a published `@superjs/std-*` package. Signatures below are
the stable v1.0 contract; breaking changes require an RFC and major version bump.

## Modules

### `std-core`

Sum-type helpers for `Option<T>` and `Result<T,E>`:

- `some`, `none`, `isSome`, `unwrapOr`, `mapOption`
- `ok`, `err`, `isOk`, `isErr`, `resultOr`, `mapResult`

### `std-math`

Constants `PI`, `E` and functions: `abs`, `sign`, `min`, `max`, `clamp`, `lerp`,
`floor`, `ceil`, `round`, `sqrt`, `pow`.

### `std-string`

`trim`, `lower`, `upper`, `split`, `join`, `includes`, `startsWith`, `endsWith`,
`replace` — pure string utilities (no I/O).

### `std-async`

`sleep(ms)`, `delayValue(ms, value)` — Promise-based delays.

### `std-path`

`basename`, `dirname`, `extname`, `join`, `isAbsolute` — POSIX-style paths.

### `std-collections`

Generic `List<T>` with `listOf`, `push`, `get`, `length`.

### `std-process`

`args`, `env`, `cwd`, `platform`, `exit` — thin `process` wrappers (Node hosts).

### `std-time`

`SECOND`, `MINUTE`, `HOUR`, `DAY`, `nowMs`, `toISO`, `seconds`, `minutes`.

### `std-json`

`parse(text): Result<dynamic, string>`, `stringify`, `stringifyPretty` — JSON
without thrown exceptions on parse failure.

### `std-schema`

Reified validators: `string`, `number`, `boolean`, `array`, `literal`, `optional`,
`nullable`, `object`, `refine` — composable `Schema<T>` values.

### `std-fs`

`readText`, `writeText`, `exists` — Result-returning filesystem helpers (Node).

## Error shape

I/O and parse functions return `Result<T, string>` rather than throwing. This
aligns with RFC-0004 (errors as values). Hosts without filesystem support should
not import `std-fs`.

## Performance guarantees

Stdlib functions are O(n) in input size unless documented otherwise. No function
performs unbounded allocation beyond its output.

## Extension policy

New modules may be added in minor releases. Existing exported signatures are
frozen for the lifetime of SuperJS 1.x.


---

## 10. Build tool integration {#10-build-tools}

> **Grammar:** N/A — see [`specs/grammar.ebnf`](./grammar.ebnf)  
> **Errors:** compiler diagnostics in host overlay — see [`specs/error-codes.md`](./error-codes.md)

# Build Tool Integration

**Status:** v1.0  
**Implementation:** `@superjs/build-plugins` → `@superjs/vite-plugin`, `@superjs/esbuild-plugin`, `@superjs/jest-transform`, `@superjs/vitest-transform`  
**Grammar:** N/A (build pipeline)  
**Errors:** compile diagnostics from `@superjs/compiler` surface in the host tool's error overlay

---

## Overview

All build integrations are thin adapters over `transform(source, filename, opts)`
from `@superjs/compiler`. Host tools are not hard dependencies — each plugin
returns a structurally typed object matching the host's plugin interface.

## Shared transform

```typescript
transformSjs(code, id) → { code: string, map: SourceMap | undefined }
```

Default options: `{ sourceMap: 'external' }`. Emitted JavaScript is valid ES
module or script per the input file's module goal.

## Vite / Vitest

`vitePlugin()` registers as `enforce: 'pre'`, matching `/\.sjs$/` and returning
transform output. Vitest reuses the same plugin (`vitestPlugin === vitePlugin`).

**HMR:** file change triggers Vite's module graph invalidation; the plugin
re-compiles the `.sjs` module. Source maps chain to original `.sjs` spans.

## esbuild

`esbuildPlugin()` uses `onLoad` for `/\.sjs$/`, reads the file, compiles, and
returns `{ contents, loader: 'js' }`.

## Jest

`jestTransform` implements `processAsync(source, filename)` for `.sjs` test
files. Returns `{ code, map }` for Jest's coverage and stack-trace mapping.

## Source maps

See `054-source-maps.md`. External source maps are emitted by default so hosts
can compose map chains (`inputSourceMap` in Vite, `sourcemap: true` in esbuild).

## Configuration

Project-level options come from `superjs.config.json` (see `009-tooling-surface.md`
CLI section). Plugins read merged config via `@superjs/config` when invoked from
the CLI; programmatic API callers pass `TransformOpts` directly.

## Unsupported hosts

Webpack, Rollup (without esbuild), and Bun have no first-party v1.0 plugin.
Use `transform()` in a custom loader or the esbuild plugin inside `@rollup/plugin-esbuild`.


---

## Appendix A. Diagnostic codes map {#appendix-diagnostics}

> **Grammar:** N/A — see [`specs/grammar.ebnf`](./grammar.ebnf)  
> **Errors:** full registry — see specs/error-codes.md — see [`specs/error-codes.md`](./error-codes.md)

# 060 — Diagnostic Codes Reference

**Status:** Stage 0 — authoritative

---

## Overview

Master cross-reference for all SJS diagnostic codes. Each code links to the feature spec that defines it in detail. For per-code explanation, fix guidance, and examples, see `specs/error-codes/SJS-EXXX.md`.

Codes are grouped into four series:

- **E** — hard errors (compilation halts)
- **W** — warnings (compilation continues; configurable as errors via `--strict`)
- **L** — lint / style (configurable; off by default in `--loose` mode)
- **P** — parse errors (always fatal; halt before type-checking)

---

## Error Codes (SJS-E) — Hard Errors

| Code | Message summary | Feature area | Spec file |
|---|---|---|---|
| SJS-E001 | Null or undefined assigned to non-nullable type | Null safety | `001-null-safety.md` |
| SJS-E002 | Type mismatch — expression type not assignable to target type | Type system | `010-primitives.md` |
| SJS-E003 | Property access on a possibly-null or possibly-undefined value | Null safety | `001-null-safety.md` |
| SJS-E004 | `any` is not a valid type — use `dynamic` instead | Banned features | `007-banned-features.md` |
| SJS-E005 | Intersection type `A & B` not allowed in SJS | Banned features | `007-banned-features.md` |
| SJS-E006 | Mapped type, indexed access type, or `typeof` type operator not allowed | Banned features | `007-banned-features.md` |
| SJS-E007 | Non-exhaustive `match` expression — one or more variants not covered | Match | `003-match.md` |
| SJS-E020 | Ambiguous variant constructor — name is shared by multiple sum types and context is insufficient to resolve | Sum types | `002-sum-types.md` |
| SJS-E009 | `infer` keyword not allowed | Banned features | `007-banned-features.md` |
| SJS-E010 | `enum` keyword not allowed — use sum types instead | Banned features | `007-banned-features.md` |
| SJS-E011 | Non-null assertion operator `!` not allowed | Null safety | `001-null-safety.md` |
| SJS-E012 | `namespace` keyword not allowed — use ES modules | Modules | `023-modules.md` |
| SJS-E013 | `with` statement not allowed (SJS is always strict mode) | Control flow | `040-control-flow.md` |
| SJS-E014 | Private or protected member not accessible from this scope | Access modifiers | `008-access-modifiers.md` |
| SJS-E015 | Cannot narrow an access modifier on an overriding method or property | Access modifiers | `008-access-modifiers.md` |
| SJS-E016 | Cannot instantiate an abstract class directly with `new` | Classes | `022-classes.md` |
| SJS-E017 | Circular import detected — module graph contains a cycle | Modules | `023-modules.md` |
| SJS-E018 | Top-level `await` used outside an ES module context | Async/await | `037-async-await.md` |
| SJS-E019 | Unknown JSX element type — identifier not in scope or not a valid component | JSX | `039-jsx.md` (future) |

---

## Warning Codes (SJS-W) — Non-fatal

Warnings are emitted but do not halt compilation. All warnings become errors under `--strict`.

| Code | Message summary | Feature area | Spec file |
|---|---|---|---|
| SJS-W001 | Implicit `dynamic` — unannotated position in `--strict` mode | dynamic type | `004-dynamic.md` |
| SJS-W002 | `dynamic` value assigned to a typed position without a narrowing check | dynamic type | `004-dynamic.md` |
| SJS-W003 | Unreachable `match` arm — earlier arm already covers this variant | Match | `003-match.md` |
| SJS-W004 | Reserved or future SJS keyword used as an identifier | Keywords | `000-keywords.md` |
| SJS-W005 | Explicit `public` modifier is redundant — class members are public by default | Access modifiers | `008-access-modifiers.md` |
| SJS-W006 | Excess property on a fresh object literal assigned to a typed position | Object types | `014-object-types.md` |
| SJS-W007 | Missing `key` prop on JSX element in a list or iterator context | JSX | `039-jsx.md` (future) |
| SJS-W008 | Implicit switch fallthrough between non-empty case clauses | Control flow | `040-control-flow.md` |
| SJS-W009 | Unreachable code following a terminator statement (`return`, `throw`, `break`, `continue`) | Control flow | `040-control-flow.md` |
| SJS-W010 | `catch` binding not typed as `Error` or `unknown` — untyped catch may hide bugs | Try/catch | `041-try-catch.md` |

---

## Lint Codes (SJS-L) — Style / Best Practice

Lint codes are off by default in `--loose` mode and on by default in `--strict` mode. Configurable per-code in `superjs.config.json` under `"lint"`.

| Code | Message summary | Feature area | Spec file |
|---|---|---|---|
| SJS-L001 | Prefer `const` — `let` binding is never reassigned | Variables | `020-variables.md` |
| SJS-L002 | Prefer `let` or `const` over `var` | Variables | `020-variables.md` |
| SJS-L003 | Use `===` / `!==` — `==` / `!=` performs type coercion | Operators | `030-operators.md` |
| SJS-L004 | Prefer `for…of` over `for…in` for array and iterable iteration | Iteration | `042-for-of-for-in.md` |
| SJS-L005 | `debugger` statement found in committed code | Control flow | `040-control-flow.md` |

---

## Parser Codes (SJS-P) — Parse Errors

Parser errors are always fatal and halt compilation before type-checking begins.

| Code | Message summary |
|---|---|
| SJS-P001 | Unexpected token |
| SJS-P002 | Missing semicolon (when ASI does not apply) |
| SJS-P003 | Unmatched bracket, brace, or parenthesis |
| SJS-P004 | Invalid type annotation syntax |
| SJS-P005 | Prefix cast syntax `<T>expr` is not valid in SJS — use `expr as T` |

---

## Code Assignment Policy

| Range | Series |
|---|---|
| E001–E099 | Type system and semantic hard errors |
| W001–W099 | Type system and semantic warnings |
| L001–L099 | Lint and style |
| P001–P099 | Parser errors |

To add a new diagnostic code:

1. Assign the next available number in the appropriate series.
2. Document it in this file (060-error-codes-map.md) in the correct table.
3. Document it in the relevant feature spec file under its "Diagnostic codes" section.
4. Create `specs/error-codes/SJS-EXXX.md` (or WXXX / LXXX / PXXX) with the full per-code spec: description, examples, suggested fix.
5. Add a fixture to `specs/fixtures/` covering the diagnostic.

Do not reuse or retire code numbers. Retired codes must remain in this table marked `[retired]` with the date of retirement.


---
