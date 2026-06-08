# Super.js (SJS) Formal Language Specification

**Document**: SJS Language Specification, Edition 1.0
**Branch**: `001-superjs-core-language`
**Date**: 2026-05-30
**Status**: Normative Draft
**Authors**: Super.js Language Team

---

## Table of Contents

1. [Language Overview](#1-language-overview)
2. [Lexical Grammar](#2-lexical-grammar)
3. [Type System](#3-type-system)
4. [Variable Declarations](#4-variable-declarations)
5. [Functions](#5-functions)
6. [Classes](#6-classes)
7. [Modules](#7-modules)
8. [JSX](#8-jsx)
9. [Pattern Matching](#9-pattern-matching)
10. [Error Handling and Diagnostics](#10-error-handling-and-diagnostics)
11. [Compiler Pipeline](#11-compiler-pipeline)
12. [EBNF Grammar Appendix](#12-ebnf-grammar-appendix)

---

## Normative References

This specification defines Super.js (SJS) relative to the following external standards:

- **ECMA-262** — ECMAScript Language Specification, 15th Edition (2024)
  https://tc39.es/ecma262/
- **ECMA-404** — The JSON Data Interchange Syntax
  https://www.ecma-international.org/publications/standards/Ecma-404.htm
- **JSX Specification** — Facebook JSX draft specification
  https://facebook.github.io/jsx/
- **Siek & Taha 2006** — "Gradual Typing for Functional Languages"
  Proceedings of the Scheme and Functional Programming Workshop 2006.

All section cross-references of the form `§N.N` without explicit document name refer to ECMA-262.

---

## Notation

Throughout this specification:

- `TypedText` denotes terminal symbols (literal source code).
- *Italic* denotes nonterminals in the grammar.
- `[opt]` after a symbol denotes an optional occurrence.
- `{one or more}` and `{zero or more}` denote quantified sequences.
- **SJS-E001** style codes are normative diagnostic codes.
- Notes marked **Non-normative** are explanatory but not binding.

---

## 1. Language Overview

### 1.1 What Super.js Is

Super.js (file extension `.sjs`) is a **strict syntactic superset of ECMAScript** that adds:

1. **Optional static type annotations** — a gradual type system compatible with all existing JavaScript programs.
2. **Sum types (tagged unions)** — algebraic data types with pattern matching via the `match` expression.
3. **Null safety** — non-nullable types by default; nullable types use the `T?` shorthand.
4. **Native JSX** — JSX syntax is valid in any `.sjs` file without additional configuration.
5. **Unified toolchain** — a single `superjs` binary providing `build`, `format`, `lint`, `test`, and `watch` subcommands.

**Conformance requirement**: Every valid ECMAScript 5 through ES2022 program is a valid Super.js program. Super.js MUST NOT reject or alter the runtime semantics of any program accepted by ECMA-262.

### 1.2 What Super.js Is Not

- **Not a new language runtime.** SJS compiles to JavaScript; execution semantics are fully delegated to the underlying JavaScript engine.
- **Not TypeScript.** SJS deliberately excludes a large subset of TypeScript's type-level features (see §3.11 — Banned Constructs) in order to keep the type system tractable and the error messages comprehensible.
- **Not a runtime type-checker.** All type information is erased at compile time. The output `.js` file contains no type annotations.
- **Not a replacement for `any`.** SJS uses the keyword `dynamic` for the gradual/escape-hatch type in user-facing annotations, while internally the consistency relation follows the `any` semantics from Siek & Taha 2006. See §3.3.

### 1.3 The Three-Phase Roadmap

Super.js is developed in three phases, each corresponding to a distinct compiler backend:

#### Phase 1 — Babel Prototype (current)

- **Backend**: TypeScript 5.4, `@babel/parser`, `@babel/traverse`, `@babel/generator`
- **Purpose**: Reference implementation; defines the golden output for all other backends.
- **Scope**: Correct semantics, human-readable error messages, complete feature coverage.
- **Performance target**: Compile files under 1,000 lines in < 500ms on modern hardware.
- **Stability**: The prototype output is normative; all other backends must produce byte-for-byte identical `.js` for the same `.sjs` input.

#### Phase 2 — Custom JavaScript Compiler

- **Backend**: Plain Node.js (zero external runtime dependencies), hand-written recursive-descent parser and code generator.
- **Purpose**: Correctness validation against the prototype; foundation for the zero-dependency npm distribution.
- **Performance target**: Equal to or better than Phase 1; < 200ms for files under 1,000 lines.
- **Status**: In development; lexer/parser complete, type checker and code generator in progress.

#### Phase 3 — LLVM Native Backend

- **Backend**: C++17, LLVM 17+
- **Purpose**: Native-speed compilation; production toolchain for large projects.
- **Performance target**: < 50ms for files under 1,000 lines.
- **Generics**: Monomorphization of generic types at this phase.
- **Status**: Lexer and parser complete; type checker and LLVM IR code generation in progress.

### 1.4 Design Principles

1. **ECMA Superset** — All ES5–ES2022 programs compile without modification.
2. **Gradual Typing** — Annotations are optional; unannotated positions receive the dynamic type `dynamic` and compile without errors.
3. **No Silent Failures** — Type errors are reported with precise source locations and conversational messages (Rust/Elm style).
4. **Erasure Semantics** — Zero runtime overhead from the type system; the compiled output is pure JavaScript.
5. **JSX by Default** — JSX syntax is available everywhere; no pragma comment or configuration change required.
6. **Unified Toolchain** — One binary, one config file, one mental model.

---

## 2. Lexical Grammar

### 2.1 Source Text

SJS source text is Unicode text encoded in UTF-8. The source text is processed as a sequence of Unicode code points.

**Reference**: ECMA-262 §11.1 — Source Text
https://tc39.es/ecma262/#sec-source-text

A `.sjs` file MUST be valid UTF-8. A UTF-8 BOM (U+FEFF) at the start of the file is consumed and ignored.

### 2.2 Line Terminators

The following characters are line terminators in SJS:

| Character | Unicode | Name |
|-----------|---------|------|
| `\n` | U+000A | LINE FEED |
| `\r` | U+000D | CARRIAGE RETURN |
| `\r\n` | U+000D U+000A | CRLF |
| ` ` | U+2028 | LINE SEPARATOR |
| ` ` | U+2029 | PARAGRAPH SEPARATOR |

**Reference**: ECMA-262 §12.3 — Line Terminators
https://tc39.es/ecma262/#sec-line-terminators

### 2.3 White Space

SJS inherits all ECMAScript white space characters:

| Character | Unicode | Name |
|-----------|---------|------|
| `\t` | U+0009 | CHARACTER TABULATION |
| `\v` | U+000B | LINE TABULATION |
| `\f` | U+000C | FORM FEED |
| ` ` | U+0020 | SPACE |
| ` ` | U+00A0 | NO-BREAK SPACE |
| ` ` | U+FEFF | ZERO WIDTH NO-BREAK SPACE |
| Other | Unicode category Zs | Space separator |

**Reference**: ECMA-262 §12.2 — White Space
https://tc39.es/ecma262/#sec-white-space

### 2.4 Comments

SJS supports all ECMAScript comment forms:

```sjs
// Single-line comment — extends to end of line
/* Multi-line comment — can span multiple lines */
/** JSDoc comment — used by the compiler for documentation extraction */
```

**Reference**: ECMA-262 §12.4 — Comments
https://tc39.es/ecma262/#sec-comments

**Note**: JSDoc `@param`, `@returns`, and `@type` annotations in JSDoc comments are NOT processed as type information by the SJS type checker. Use SJS type annotation syntax instead.

### 2.5 Identifiers

SJS identifiers follow the ECMAScript IdentifierName production:

```
IdentifierName ::
    IdentifierStart
    IdentifierName IdentifierPart

IdentifierStart ::
    UnicodeIDStart
    "$"
    "_"
    "\" UnicodeEscapeSequence

IdentifierPart ::
    UnicodeIDContinue
    "$"
    "\" UnicodeEscapeSequence
    <ZWNJ>
    <ZWJ>
```

**Reference**: ECMA-262 §12.6 — Names and Keywords
https://tc39.es/ecma262/#sec-names-and-keywords

All Unicode identifiers valid in ECMAScript are valid in SJS.

```sjs
const cafe = "coffee"      // valid — ASCII
const café = "coffee"      // valid — Unicode letter
const _private = true      // valid — underscore prefix
const $element = null      // valid — dollar sign prefix
```

### 2.6 Keywords

SJS extends the ECMAScript reserved word set with the following additional keywords. These identifiers cannot be used as variable names in typed positions.

#### 2.6.1 Inherited ECMAScript Keywords

The following ECMAScript reserved words remain reserved in SJS:

**Reference**: ECMA-262 §12.6.2 — Reserved Words
https://tc39.es/ecma262/#sec-reserved-words

```
await         break         case          catch         class
const         continue      debugger      default       delete
do            else          export        extends       finally
for           function      if            import        in
instanceof    let           new           return        static
super         switch        this          throw         try
typeof        var           void          while         with
yield
```

Future reserved words (in strict mode, per ECMAScript):
```
enum          implements    interface     package       private
protected     public
```

**Note**: `interface` and `implements` are reserved in ECMAScript strict mode. SJS promotes `interface` to a full keyword (see §2.6.2). The SJS compiler always operates in strict-mode semantics for type annotations, regardless of `'use strict'` directives.

#### 2.6.2 SJS-Specific Keywords

SJS adds the following keywords that have no meaning in plain ECMAScript:

| Keyword | Purpose | Section |
|---------|---------|---------|
| `type` | Type alias declaration | §3.7 |
| `interface` | Interface declaration | §3.6 |
| `match` | Pattern matching expression | §9 |
| `dynamic` | The gradual/escape-hatch type annotation | §3.3 |

These keywords are **contextual**: they are reserved only in positions where SJS type syntax is expected. In non-type positions, they remain valid identifiers for backward compatibility with JavaScript code that uses these as variable names.

```sjs
// Contextual — these are NOT errors:
const type = "square"          // ok — 'type' as identifier in value position
const interface = {}           // ok — 'interface' as identifier in value position

// These use keywords in their SJS sense:
type Point = { x: number; y: number }    // 'type' as keyword
interface Shape { area(): number }        // 'interface' as keyword
```

**Diagnostic**: Using `match` as an identifier in an ambiguous position emits `SJS-W005` (Ambiguous identifier).

### 2.7 Punctuators

SJS inherits all ECMAScript punctuators:

```
{ } ( ) [ ] . ... ; , < > <= >= == != === !== + - * % ** ++ --
<< >> >>> & | ^ ! ~ && || ?? ? : = += -= *= %= **= <<= >>= &= |= ^= &&= ||= ??=
=> /
```

**Reference**: ECMA-262 §12.7 — Punctuators
https://tc39.es/ecma262/#sec-punctuators

SJS adds the following punctuators for type annotation syntax:

| Punctuator | Usage | Example |
|------------|-------|---------|
| `:` | Type annotation separator | `let x: number` |
| `?` (postfix on type) | Nullable type shorthand | `T?` means `T \| null \| undefined` |
| `<` `>` | Generic type parameters | `Array<T>`, `function f<T>` |
| `=>` (in type) | Function type | `(x: number) => string` |
| `\|` (in type) | Union type | `string \| number` |
| `&` (in type) | Intersection type | `A & B` |

**Non-normative note**: The `<` and `>` punctuators are already valid ECMAScript punctuators (less-than, greater-than). Their interpretation as generic delimiters is context-sensitive: the SJS parser determines from context whether `f<T>(x)` is a generic function call or a comparison expression chain. The resolution algorithm uses the same heuristic as TypeScript.

### 2.8 Literals

SJS inherits all ECMAScript literal forms with no modifications.

#### 2.8.1 Numeric Literals

**Reference**: ECMA-262 §12.8.3 — Numeric Literals
https://tc39.es/ecma262/#sec-literals-numeric-literals

```sjs
42           // DecimalLiteral — integer
3.14         // DecimalLiteral — floating-point
0xFF         // HexIntegerLiteral
0o755        // OctalIntegerLiteral (ES2015+)
0b1010       // BinaryIntegerLiteral (ES2015+)
1_000_000    // NumericLiteralSeparator (ES2021+)
```

All numeric literals have SJS type `number` (§3.2.1). The `number` type maps to the IEEE 754-2019 double-precision 64-bit binary floating-point format, exactly as specified in ECMA-262 §6.1.6.1.

#### 2.8.2 String Literals

**Reference**: ECMA-262 §12.8.4 — String Literals
https://tc39.es/ecma262/#sec-literals-string-literals

```sjs
"hello"          // DoubleStringLiteral
'world'          // SingleStringLiteral
`template`       // TemplateLiteral (ES2015+)
`hello ${name}`  // TemplateLiteral with substitution
```

All string literals have SJS type `string`. Template literals without substitutions also have type `string`. Template literals with substitutions have type `string` if all substituted expressions have type `string | number | boolean | bigint`; otherwise the substitution expressions' types are not further constrained (they are coerced to string at runtime, per §7.1.17 of ECMA-262).

#### 2.8.3 Boolean Literals

**Reference**: ECMA-262 §12.8.5 — Boolean Literals
https://tc39.es/ecma262/#sec-ecmascript-language-expressions-boolean-literals

```sjs
true
false
```

Both have SJS type `boolean`.

#### 2.8.4 `null` Literal

**Reference**: ECMA-262 §12.8.6 — The null Value
https://tc39.es/ecma262/#sec-null-literals

```sjs
null
```

Has SJS type `null`. A variable declared as `string` cannot be assigned `null` without including `null` in the type (see §3.4 — Null Safety).

#### 2.8.5 BigInt Literals

**Reference**: ECMA-262 §12.8.3 — BigInt Literals (§6.1.6.2)
https://tc39.es/ecma262/#sec-ecmascript-language-types-bigint-type

```sjs
42n
0xFFn
0b1010n
```

Have SJS type `bigint`.

#### 2.8.6 Regular Expression Literals

**Reference**: ECMA-262 §12.8.7 — Regular Expression Literals
https://tc39.es/ecma262/#sec-literals-regular-expression-literals

```sjs
/[a-z]+/gi
```

Have SJS type `RegExp` (the built-in `RegExp` interface).

---

## 3. Type System

### 3.1 Overview

The SJS type system is a **bidirectional, gradually-typed** system built on two foundational concepts:

1. **Bidirectional type checking** (Pierce & Turner 2000): Type information flows both bottom-up (synthesis) and top-down (checking). Each expression either *synthesizes* a type from its subexpressions or is *checked* against an expected type from its context.

2. **Gradual typing** (Siek & Taha 2006): The *dynamic type* (`dynamic` in user-facing syntax) is *consistent* with every other type. Unannotated positions receive `dynamic` implicitly, allowing plain JavaScript files to compile without errors.

The type system is **sound in the annotated fragment**: if all positions in a program are annotated and no `dynamic` appears, type errors are caught statically. In the unannotated fragment, the system degrades gracefully to JavaScript's runtime semantics.

**Phase 3 note**: The LLVM backend performs monomorphization of generic types, enabling zero-cost abstractions in native compilation. Phases 1 and 2 treat generics as erasure-based (type parameters are erased; no runtime specialization occurs).

### 3.2 The Type Universe

The complete set of types in SJS is:

```
Type ::=
    PrimitiveType
  | NullType
  | UndefinedType
  | VoidType
  | NeverType
  | DynamicType
  | ObjectType
  | RecordType
  | ArrayType
  | TupleType
  | FunctionType
  | UnionType
  | IntersectionType
  | SumType
  | InterfaceType
  | GenericType
  | LiteralType
```

### 3.2.1 Primitive Types

Every SJS primitive maps one-to-one to an ECMAScript Language Type (§6.1):

| SJS Annotation | ECMAScript Type | Internal Representation | Spec |
|----------------|-----------------|------------------------|------|
| `number` | Number | IEEE 754 double (f64) | [§6.1.6.1](https://tc39.es/ecma262/#sec-ecmascript-language-types-number-type) |
| `string` | String | UTF-16 sequence | [§6.1.4](https://tc39.es/ecma262/#sec-ecmascript-language-types-string-type) |
| `boolean` | Boolean | `true` or `false` | [§6.1.3](https://tc39.es/ecma262/#sec-ecmascript-language-types-boolean-type) |
| `symbol` | Symbol | Unique, immutable key | [§6.1.5](https://tc39.es/ecma262/#sec-ecmascript-language-types-symbol-type) |
| `bigint` | BigInt | Arbitrary-precision integer | [§6.1.6.2](https://tc39.es/ecma262/#sec-ecmascript-language-types-bigint-type) |

**Root reference**: ECMA-262 §6.1 — ECMAScript Language Types
https://tc39.es/ecma262/#sec-ecmascript-language-types

**TC-001 (Primitive Consistency)**: An initializer of an annotated binding must be *consistent* with the declared primitive type. Inconsistency produces `SJS-E001`.

```sjs
const x: number = 42        // ok — number literal ~ number
const y: number = "hello"   // SJS-E001 — string is not consistent with number
const z: string = `hello`   // ok — template literal ~ string
const b: boolean = true     // ok
const s: symbol = Symbol()  // ok — Symbol() returns a symbol value
```

#### 3.2.2 Special Types

##### `null`

The type inhabited only by the value `null`.

**Reference**: ECMA-262 §6.1.2 — The Null Type
https://tc39.es/ecma262/#sec-ecmascript-language-types-null-type

```sjs
const n: null = null    // ok
const n2: null = 0      // SJS-E001 — number is not null
```

##### `undefined`

The type inhabited only by the value `undefined`.

**Reference**: ECMA-262 §6.1.1 — The Undefined Type
https://tc39.es/ecma262/#sec-ecmascript-language-types-undefined-type

```sjs
const u: undefined = undefined    // ok
```

##### `void`

The type of a function that does not return a value. `void` is NOT the same as `undefined`. A `void` function may technically return `undefined` at runtime, but the caller must not use the return value.

**Reference**: ECMA-262 §15.8.3 step 3 — absent completion value
https://tc39.es/ecma262/#sec-function-declarations-runtime-semantics-instantiateordinaryfunctionobject

```sjs
function logMessage(msg: string): void {
  console.log(msg)
  // implicit return — ok
}

function badVoid(): void {
  return 42   // SJS-E002 — void function must not return a value
}
```

**TC-005c**: A function declared `: void` that contains a `return expr` statement (where `expr` is not `undefined`) produces `SJS-E002`.

##### `never`

The bottom type — the type of expressions that never complete normally (throw, infinite loop, etc.). `never` is assignable to every type; no value inhabits `never`.

```sjs
function fail(msg: string): never {
  throw new Error(msg)
}

function loop(): never {
  while (true) {}
}

// never is assignable to anything — used in exhaustive checks
function processResult(r: "ok" | "err"): string {
  if (r === "ok") return "good"
  if (r === "err") return "bad"
  const _exhaustive: never = r   // SJS-E001 if r has remaining cases
  return _exhaustive
}
```

### 3.3 The Dynamic Type (`dynamic`)

**Normative designation**: In SJS source code, the escape-hatch gradual type is written `dynamic`. This keyword replaces `any` from TypeScript in the user-facing syntax. The keyword `any` is BANNED in SJS source code (see §3.11).

**Semantics**: `dynamic` is the gradual type from Siek & Taha 2006. It participates in the *consistency* relation (`~`) rather than the *subtype* relation (`<:`):

- `dynamic ~ T` holds for all types `T` (dynamic is consistent with any type)
- `T ~ dynamic` holds for all types `T` (any type is consistent with dynamic)
- `number ~ string` is FALSE — consistency is not a total relation; it only exempts `dynamic`

```sjs
let x: dynamic = "hello"    // ok — string consistent with dynamic
x = 42                       // ok — number consistent with dynamic
x = true                     // ok

const y: dynamic = x         // ok — dynamic consistent with dynamic
const z: number = x          // ok — dynamic consistent with number (gradual)
const w: number = "oops"     // SJS-E001 — string NOT consistent with number
```

**Implicit dynamic**: Every position without a type annotation receives type `dynamic` implicitly. This is the core mechanism that makes SJS backward-compatible with plain JavaScript.

```sjs
let count = 0          // count: dynamic (no annotation)
count = "hello"        // ok — dynamic allows any assignment
count = []             // ok
```

**Strict mode**: When `--strict` is active (or `strict: true` in `superjs.config.json`), implicit `dynamic` positions emit `SJS-W001` (Implicit dynamic type). Explicit `dynamic` annotations are always permitted.

**Reference**: Siek & Taha, "Gradual Typing for Functional Languages", SCHEME 2006, §3 — Consistency relation.

### 3.4 Null Safety

By default, SJS types are **non-nullable**. A value of type `string` cannot be `null` or `undefined`.

**Null Safety Rule**: A binding declared with type `T` where `T` does not include `null` or `undefined` cannot be assigned `null` or `undefined`. Violation produces `SJS-E001`.

```sjs
let name: string = "Alice"   // ok
name = null                   // SJS-E001 — null not assignable to string
name = undefined              // SJS-E001 — undefined not assignable to string
```

#### 3.4.1 The Nullable Shorthand `T?`

The postfix `?` on a type annotation is syntactic sugar for `T | null | undefined`:

```sjs
let name: string? = null        // ok — string? = string | null | undefined
let age: number? = undefined    // ok
let x: boolean? = true         // ok — non-null value also valid
```

**Equivalences**:
- `T?` is exactly `T | null | undefined`
- `string?` is `string | null | undefined`
- `(T?)? ` is `T | null | undefined` (not double-nullable; the union is flattened)

#### 3.4.2 Optional Object Properties

Object properties suffixed with `?` in their key name are optional (may be absent or undefined):

```sjs
interface User {
  name: string
  email: string
  age?: number   // present and number, OR absent (undefined)
}

const u: User = { name: "Alice", email: "a@b.com" }  // ok — age absent
const v: User = { name: "Bob", email: "b@c.com", age: 30 }  // ok
```

**Distinction**: Property-optional (`age?:`) and type-nullable (`age: number?`) have different semantics:
- `age?: number` — the property may be absent from the object entirely
- `age: number?` — the property must be present, but its value may be `null` or `undefined`
- `age?: number?` — the property may be absent OR present with value `null`/`undefined`/`number`

### 3.5 Object and Record Types

An object type (record type) describes the shape of an object value:

```sjs
type Point = { x: number; y: number }
type Config = { host: string; port: number; debug?: boolean }
```

**Reference**: ECMA-262 §6.1.7 — The Object Type
https://tc39.es/ecma262/#sec-object-type

**TC-Object-1 (Structural Subtyping)**: Object types are structurally typed. An object `A` is a subtype of `B` if `A` has at least the required properties of `B` with consistent types:

```sjs
type Named = { name: string }
type Person = { name: string; age: number }

const p: Person = { name: "Alice", age: 30 }
const n: Named = p    // ok — Person has all properties of Named (and more)
```

**TC-Object-2 (Excess Property Checking)**: Object literals assigned directly to a typed variable are checked for excess (unexpected) properties. This catches typos in property names.

```sjs
type Point = { x: number; y: number }
const p: Point = { x: 1, y: 2, z: 3 }  // SJS-E008 — unexpected property 'z'
```

Excess property checking applies only to **object literals at the assignment site**, not to variables passed through:

```sjs
const obj = { x: 1, y: 2, z: 3 }
const p: Point = obj    // ok — obj passes through; not a literal assignment
```

#### 3.5.1 Index Signatures

An index signature allows an object to have additional properties beyond those explicitly declared:

```sjs
interface StringMap {
  [key: string]: string
}

const headers: StringMap = {
  "Content-Type": "application/json",
  "X-Custom": "value",
}
```

**Reference**: This pattern matches ECMAScript's property access semantics (§13.3.2).
https://tc39.es/ecma262/#sec-property-accessors

### 3.6 Arrays and Tuples

#### 3.6.1 Array Types

SJS supports two equivalent syntaxes for array types:

```sjs
let nums: number[]          // shorthand
let strs: Array<string>    // generic form
```

Both are identical in the type system. The shorthand `T[]` is preferred by the SJS formatter.

**Reference**: ECMA-262 §10.4.2 — Array Exotic Objects
https://tc39.es/ecma262/#sec-array-exotic-objects

```sjs
const xs: number[] = [1, 2, 3]        // ok
const ys: string[] = ["a", "b"]       // ok
const zs: number[] = [1, "two", 3]    // SJS-E001 — string not consistent with number
```

**Array element type**: An array literal `[e1, e2, ..., en]` synthesizes type `T[]` where `T` is the union of all element types. If no annotation is present, the inferred element type is `dynamic`.

```sjs
const mixed = [1, "a", true]    // mixed: dynamic[] (no annotation)
const nums: number[] = [1, 2, 3] // ok — all elements checked as number
```

#### 3.6.2 Tuple Types

A tuple is a fixed-length array with typed positions:

```sjs
type Pair = [string, number]
type Triple = [boolean, string, number?]  // last element optional

const p: Pair = ["hello", 42]    // ok
const q: Pair = [42, "hello"]    // SJS-E001 — elements in wrong order
```

### 3.7 Type Aliases

A type alias introduces a name for a type expression:

```sjs
type UserId = string
type Callback<T> = (value: T) => void
type Result<T> = Ok<T> | Err<string>
```

**Syntax**:

```
TypeAlias ::= "type" Identifier TypeParameters[opt] "=" Type
```

Type aliases are purely a naming convenience; `UserId` and `string` are interchangeable at every point.

### 3.8 Union Types

A union type `A | B` describes a value that may be either `A` or `B`:

**Reference**: No direct ECMA-262 analogue; union types are a type-system construct layered over ECMAScript's dynamic values.

```sjs
type StringOrNumber = string | number
type Status = "pending" | "success" | "error"   // literal union

let id: string | number = "user-123"
id = 42                    // ok — number consistent with string | number
id = true                  // SJS-E001 — boolean not in union
```

**TC-007 (Union Consistency)**: A value `v` of type `T` is consistent with union `A | B` if `T ~ A` or `T ~ B`. Narrowing (§3.8.1) is required to access union member operations.

#### 3.8.1 Type Narrowing

Within conditional branches that check the type of a union, the type of the variable is *narrowed*:

```sjs
function process(val: string | number): string {
  if (typeof val === "string") {
    return val.toUpperCase()   // val: string here
  } else {
    return val.toFixed(2)      // val: number here
  }
}
```

SJS supports the following narrowing patterns:

| Narrowing Pattern | Narrows To |
|-------------------|-----------|
| `typeof x === "string"` | `string` |
| `typeof x === "number"` | `number` |
| `typeof x === "boolean"` | `boolean` |
| `typeof x === "bigint"` | `bigint` |
| `typeof x === "symbol"` | `symbol` |
| `typeof x === "function"` | function type |
| `x === null` | `null` |
| `x !== null` | removes `null` from union |
| `x instanceof C` | `C` (the class) |
| `"tag" in x` | type with property `tag` |

### 3.9 Intersection Types

An intersection type `A & B` describes a value that has all properties of both `A` and `B`:

```sjs
interface HasName { name: string }
interface HasAge  { age: number }

type Person = HasName & HasAge

const p: Person = { name: "Alice", age: 30 }    // ok
const q: Person = { name: "Bob" }               // SJS-E001 — missing age
```

**Intersection vs. sum types**: Use intersection for objects that combine multiple shapes. Use sum types (§3.10) for values that are one thing OR another.

### 3.10 Sum Types (Tagged Unions / Algebraic Data Types)

Sum types are the SJS equivalent of Rust's `enum` variants or Haskell's `data` types. They are the idiomatic way to model values that can take one of several distinct forms, each potentially carrying different data.

**Syntax**:

```
SumTypeDecl ::= "type" Identifier TypeParameters[opt] "=" SumVariant { "|" SumVariant }
SumVariant  ::= Identifier "(" TypeList[opt] ")"
             | Identifier
```

```sjs
type Result<T> = Ok(T) | Err(string)
type Shape = Circle(number) | Rectangle(number, number) | Point
type Tree<T> = Leaf | Node(T, Tree<T>, Tree<T>)
```

**Phase 1 Compilation**: In the Babel prototype backend, sum types compile to plain JavaScript objects with a `_tag` discriminant and positional `_0`, `_1`, ... fields:

```sjs
// SJS source
type Result<T> = Ok(T) | Err(string)
const r: Result<number> = Ok(42)
const e: Result<number> = Err("not found")
```

Compiles to:

```js
// Compiled JavaScript (Phase 1)
const r = { _tag: "Ok", _0: 42 }
const e = { _tag: "Err", _0: "not found" }
```

**Phase 3 Compilation**: The LLVM backend may use native tagged union representations for performance.

**Construction**: Sum type variants are called as functions:

```sjs
type Option<T> = Some(T) | None

const found: Option<string> = Some("hello")
const missing: Option<string> = None          // unit variant — no parens needed
```

**Pattern matching**: Sum types are deconstructed with `match` expressions (§9).

**SJS-E009 (Unknown Variant)**: Using an undeclared variant name produces `SJS-E009`.

```sjs
type Color = Red | Green | Blue
const c = Yellow   // SJS-E009 — Yellow is not a variant of Color
```

### 3.11 Interfaces

SJS interfaces define the **shape** of an object type. Interfaces are structurally typed — a type satisfies an interface if it has all the required members with consistent types, **without any explicit `implements` declaration** (Go-style implicit satisfaction).

**Syntax**:

```
InterfaceDecl ::= "interface" Identifier TypeParameters[opt] ExtendsList[opt] "{" MemberList "}"
ExtendsList   ::= "extends" Identifier { "," Identifier }
MemberList    ::= { Member }
Member        ::= PropertySig | MethodSig | IndexSig
PropertySig   ::= Identifier "?"[opt] ":" Type
MethodSig     ::= Identifier TypeParameters[opt] "(" ParameterList[opt] ")" ":" Type
IndexSig      ::= "[" Identifier ":" "string" "]" ":" Type
```

```sjs
interface Animal {
  name: string
  speak(): string
}

interface Dog extends Animal {
  breed: string
  fetch(): void
}

// Implicit satisfaction — no 'implements' needed:
const myDog = {
  name: "Rex",
  breed: "Labrador",
  speak() { return "Woof!" },
  fetch() { console.log("fetching") },
}

function describe(a: Animal): string {
  return `${a.name} says ${a.speak()}`
}

describe(myDog)    // ok — myDog satisfies Animal structurally
```

#### 3.11.1 Interface vs. Type Alias

| Feature | `interface` | `type` alias |
|---------|------------|-------------|
| Can be extended | Yes (`extends`) | Via intersection (`&`) |
| Implicit satisfaction | Yes | Yes |
| Can describe non-objects | No | Yes (primitives, unions, functions) |
| Declaration merging | No (SJS does not support declaration merging) | No |
| Can describe sum types | No | Yes |

### 3.12 Generics

Generic types allow code to be written for multiple types while preserving type safety.

**Syntax**:

```
TypeParameters  ::= "<" TypeParam { "," TypeParam } ">"
TypeParam       ::= Identifier Constraint[opt] DefaultType[opt]
Constraint      ::= ":" Type
DefaultType     ::= "=" Type
```

#### 3.12.1 Generic Functions

```sjs
function identity<T>(x: T): T {
  return x
}

const id = identity<string>("hello")    // explicit type argument
const id2 = identity(42)               // inferred: identity<number>
```

#### 3.12.2 Generic Constraints

Type parameters may be constrained with `: Interface`:

```sjs
interface Printable {
  toString(): string
}

function print<T: Printable>(val: T): void {
  console.log(val.toString())
}

print(42)         // ok — number has toString()
print({ x: 1 })  // SJS-E003 — { x: number } does not satisfy Printable
```

**Reference**: ECMA-262 §10.2.1 — Bound Names (the concept of scoping to which constraints apply)

#### 3.12.3 Generic Interfaces and Types

```sjs
interface Container<T> {
  value: T
  map<U>(f: (val: T) => U): Container<U>
}

type Pair<A, B> = { first: A; second: B }
type Maybe<T> = Some(T) | None
```

#### 3.12.4 Default Type Parameters

```sjs
type EventHandler<E = Event> = (event: E) => void

const onClick: EventHandler = (e) => console.log(e.type)    // E defaults to Event
const onCustom: EventHandler<MouseEvent> = (e) => console.log(e.x)
```

#### 3.12.5 Phase 3 Monomorphization

In the LLVM backend (Phase 3), generic types are monomorphized: for each distinct instantiation `Container<string>`, `Container<number>`, etc., the compiler generates a separate concrete type and set of functions. This enables zero-cost abstractions at the native level. Phases 1 and 2 use erasure semantics — generics are erased and all type arguments are treated as `dynamic` at runtime.

### 3.13 Function Types

A function type describes the signature of a callable value:

```sjs
type Predicate<T> = (x: T) => boolean
type BinaryOp = (a: number, b: number) => number
type AsyncFetcher<T> = (url: string) => Promise<T>
```

**Syntax**:

```
FunctionType ::= "(" ParameterTypeList[opt] ")" "=>" Type
ParameterTypeList ::= ParameterType { "," ParameterType }
ParameterType ::= Identifier "?"[opt] ":" Type
               | "..." Identifier ":" Type
```

```sjs
function apply<T, U>(f: (x: T) => U, val: T): U {
  return f(val)
}

const double: (x: number) => number = (x) => x * 2
const greeting: (name: string, greeting?: string) => string =
  (name, greeting = "Hello") => `${greeting}, ${name}!`
```

### 3.14 Literal Types

A literal type represents exactly one value:

```sjs
type Status = "active" | "inactive" | "deleted"
type Direction = "north" | "south" | "east" | "west"
type Port = 80 | 443 | 8080

let s: Status = "active"    // ok
s = "removed"               // SJS-E001 — "removed" not in Status
```

**Widening**: When a `const` variable with a literal type is passed to a context expecting a wider type, the literal type *widens* to the containing primitive type:

```sjs
const s = "hello"           // s: "hello" (narrow literal type for const)
let t: string = s           // ok — "hello" widens to string
```

### 3.15 Intersection Types

See §3.9.

### 3.16 Utility Types

SJS provides a small set of built-in generic utility types. Unlike TypeScript, mapped types and conditional types are not available, so these utility types are built into the compiler rather than being derived types.

| Utility | Description |
|---------|-------------|
| `Partial<T>` | All properties of `T` made optional |
| `Required<T>` | All optional properties of `T` made required |
| `Readonly<T>` | All properties of `T` become read-only |
| `Pick<T, K>` | Object type with only keys `K` from `T` |
| `Omit<T, K>` | Object type with all keys of `T` except `K` |
| `Record<K, V>` | Object type mapping keys `K` to values `V` |
| `ReturnType<F>` | Return type of function type `F` |
| `Parameters<F>` | Tuple of parameter types of function type `F` |
| `NonNullable<T>` | Removes `null` and `undefined` from `T` |
| `Awaited<T>` | Unwraps `Promise<T>` to `T` |

**Phase 3 note**: In the LLVM backend, `Partial<T>`, `Required<T>`, `Readonly<T>`, `Pick`, `Omit`, and `Record` are implemented as first-class type constructors with efficient internal representations.

### 3.17 Banned Type Constructs

The following TypeScript features are **explicitly banned** in SJS source code. Using them produces `SJS-E010` (Banned type construct).

| Banned Feature | Reason | SJS Alternative |
|----------------|--------|----------------|
| `any` keyword | Ambiguous; replaced by `dynamic` | Use `dynamic` |
| Mapped types `{ [K in keyof T]: ... }` | Exponential type complexity | Use `Partial<T>`, `Pick<T, K>`, etc. |
| Conditional types `T extends U ? A : B` | Undecidable in general; hard to error-report | Use sum types or overloads |
| Template literal types `` `prefix${T}` `` | Cartesian product explosion | Use `string` or literal unions |
| `infer` keyword | Only meaningful inside conditional types | — |
| TypeScript `enum` keyword | Compiled inconsistently; use sum types instead | Use sum types (§3.10) |
| Decorators (stage 3+ TC39) | Pending TC39 stabilization | Tracked for Phase 4 |
| `as` type assertion (unsafe) | Bypasses the type system silently | Use `as unknown as T` (two-step) |
| Non-null assertion `x!` | Unsafe; silently suppresses errors | Narrow explicitly with `if (x !== null)` |

```sjs
// BANNED:
let x: any = 5                       // SJS-E010 — use 'dynamic'
type Mut<T> = { [K in keyof T]: T[K] }  // SJS-E010 — mapped types not allowed
type IsString<T> = T extends string ? true : false  // SJS-E010 — conditional types not allowed
enum Color { Red, Green, Blue }       // SJS-E010 — use sum types

// ALLOWED alternatives:
let x: dynamic = 5                   // ok
type Color = Red | Green | Blue      // ok — SJS sum type
```

---

## 4. Variable Declarations

### 4.1 Overview

SJS extends all three ECMAScript variable declaration forms (`const`, `let`, `var`) with optional type annotations.

**Reference**: ECMA-262 §14.3 — Variable Statement
https://tc39.es/ecma262/#sec-declarations-and-the-variable-statement

### 4.2 `const` Declarations

```sjs
const name: string = "Alice"
const PI: number = 3.14159
const empty: string[] = []
```

**TC-004 (Const Declaration Rule)**:
1. The initializer expression is checked against the declared type.
2. `const` bindings are immutable after initialization. Reassignment is rejected by ECMAScript at runtime (TypeError, per §14.3.1) and flagged by the SJS type checker as `SJS-E007`.
3. If no type annotation is present, the initializer type is inferred. For `const`, the inferred type may be a narrow literal type.

```sjs
const x = 42           // x: 42 (literal type narrowing for const)
const y = "hello"      // y: "hello" (literal type)
const z = [1, 2, 3]   // z: dynamic[] (no annotation; gradual)
```

**Reference**: ECMA-262 §14.3.1 — Let and Const Declarations
https://tc39.es/ecma262/#sec-let-and-const-declarations

### 4.3 `let` Declarations

```sjs
let count: number = 0
let name: string = "Bob"
let flags: boolean[] = [true, false]
```

**TC-004 (Let Re-assignment Rule)**:
Re-assignment to a `let` binding with a type annotation must be consistent with the declared type:

```sjs
let x: number = 1
x = 2         // ok — number ~ number
x = "hello"   // SJS-E001 — string is not consistent with number
```

**Reference**: ECMA-262 §14.3.1 — Let and Const Declarations; §13.15 — Assignment Operators
https://tc39.es/ecma262/#sec-assignment-operators

### 4.4 `var` Declarations

`var` declarations are supported for backward compatibility with existing JavaScript code.

```sjs
var count: number = 0
```

**TC-004 (Var Hoisting)**: `var` declarations are hoisted to the containing function scope per ECMAScript semantics. The SJS type checker models this correctly: the binding is visible throughout the function, not just after the declaration site.

**Non-normative note**: New SJS code should prefer `const` and `let`. The linter rule `SJS-L003` warns on `var` usage.

**Reference**: ECMA-262 §14.3.2 — Variable Statement (var)
https://tc39.es/ecma262/#sec-variable-statement

### 4.5 Destructuring Declarations

SJS supports typed destructuring in both array and object patterns:

```sjs
// Object destructuring
const { name, age }: { name: string; age: number } = getUser()

// Array destructuring
const [first, second]: [string, number] = getPair()

// Nested destructuring
const { address: { city, zip } }: User = user

// Destructuring with defaults
const { timeout = 5000 }: { timeout?: number } = config
```

**Reference**: ECMA-262 §14.3.3 — Destructuring Binding Patterns
https://tc39.es/ecma262/#sec-destructuring-binding-patterns

### 4.6 Gradual Typing and Variable Declarations

When no type annotation is present, the binding receives type `dynamic`:

```sjs
// Non-strict mode (default):
let x = "hello"    // x: dynamic — no annotation
x = 42             // ok — dynamic allows any assignment
x = {}             // ok

// With --strict:
let x = "hello"   // warning[SJS-W001]: 'x' implicitly has type 'dynamic' ...
```

The `dynamic` type propagates: operations on a `dynamic` value produce `dynamic`:

```sjs
let x: dynamic = "hello"
let y = x.length    // y: dynamic — method result on dynamic is dynamic
let z = x + 1       // z: dynamic
```

---

## 5. Functions

### 5.1 Named Function Declarations

```sjs
function add(a: number, b: number): number {
  return a + b
}

function greet(name: string, greeting: string = "Hello"): string {
  return `${greeting}, ${name}!`
}
```

**TC-005 (Function Return Type Rule)**:

1. If a return type annotation is present, every `return expr` statement is checked against it.
2. If a function with a return type annotation has a path that falls off the end without returning, `SJS-E002` is produced (missing return).
3. If no annotation is present, the return type is inferred as `dynamic`.

**Reference**: ECMA-262 §15.2 — Function Definitions
https://tc39.es/ecma262/#sec-function-definitions

```sjs
function divide(a: number, b: number): number {
  if (b === 0) throw new Error("Division by zero")
  return a / b    // ok — number ~ number
}

function bad(): number {
  // SJS-E002 — not all code paths return a value
  if (Math.random() > 0.5) return 42
}
```

### 5.2 Arrow Functions

**Reference**: ECMA-262 §15.3 — Arrow Function Definitions
https://tc39.es/ecma262/#sec-arrow-function-definitions

```sjs
const double = (x: number): number => x * 2
const greet = (name: string): string => `Hello, ${name}!`
const noOp = (): void => {}
```

**Concise body form** (implicit return):

```sjs
const double: (x: number) => number = x => x * 2
```

**Block body form** (explicit return required if return type annotated):

```sjs
const classify = (n: number): string => {
  if (n < 0) return "negative"
  if (n === 0) return "zero"
  return "positive"
}
```

### 5.3 Optional Parameters

A parameter marked with `?` may be omitted at the call site. Its type inside the function body is `T | undefined`.

```sjs
function greet(name: string, title?: string): string {
  if (title !== undefined) {
    return `Hello, ${title} ${name}!`
  }
  return `Hello, ${name}!`
}

greet("Alice")           // ok — title omitted
greet("Alice", "Dr.")    // ok
greet("Alice", 42)       // SJS-E003 — 42 is not consistent with string
```

**TC-006-Optional**: Optional parameters must come after all required parameters. Declaring required parameters after optional ones produces `SJS-E011`.

### 5.4 Default Parameters

Parameters with default values are implicitly optional at the call site:

```sjs
function createUser(
  name: string,
  role: string = "user",
  active: boolean = true
): User {
  return { name, role, active }
}

createUser("Alice")               // ok — role="user", active=true
createUser("Bob", "admin")        // ok — active=true
createUser("Carol", "mod", false) // ok
```

**Type inference for defaults**: If a parameter has a default but no type annotation, its type is inferred from the default value's type:

```sjs
function timeout(ms = 5000) {    // ms: number (inferred from 5000)
  return new Promise(r => setTimeout(r, ms))
}
```

**Reference**: ECMA-262 §15.2.3 — Default parameters
https://tc39.es/ecma262/#sec-function-definitions

### 5.5 Rest Parameters

A rest parameter collects remaining arguments into an array:

```sjs
function sum(...nums: number[]): number {
  return nums.reduce((acc, n) => acc + n, 0)
}

sum(1, 2, 3)       // ok — [1, 2, 3]
sum(1, "two", 3)   // SJS-E003 — "two" is not consistent with number
```

**TC-006-Rest**: The rest parameter must be the last parameter. Its type annotation must be an array type `T[]`.

**Reference**: ECMA-262 §15.2.3 — Rest parameters
https://tc39.es/ecma262/#sec-function-definitions

### 5.6 Generic Functions

```sjs
function identity<T>(x: T): T {
  return x
}

function first<T>(arr: T[]): T | undefined {
  return arr[0]
}

function zip<A, B>(a: A[], b: B[]): [A, B][] {
  return a.map((v, i) => [v, b[i]])
}
```

**Type argument inference**: In most cases, type arguments can be inferred from the call site:

```sjs
const s = identity("hello")      // inferred: identity<string>
const n = identity(42)           // inferred: identity<number>
const f = first([1, 2, 3])      // inferred: first<number>

// Explicit type argument when inference fails:
const x = identity<string | number>("hello")
```

### 5.7 Overloads

SJS supports function overload signatures (compile-time only; no runtime dispatch):

```sjs
function parse(s: string): number
function parse(n: number): string
function parse(input: string | number): string | number {
  if (typeof input === "string") return parseInt(input, 10)
  return input.toString()
}
```

**Overload resolution**: The compiler tries overload signatures in order, top to bottom. The first matching overload wins.

### 5.8 Async Functions

```sjs
async function fetchUser(id: number): Promise<User> {
  const res = await fetch(`/api/users/${id}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as unknown as User
}
```

The return type of an async function must be `Promise<T>`. A function declared `async` with return type `T` (not `Promise<T>`) is automatically wrapped: the actual return type is `Promise<T>`.

**Reference**: ECMA-262 §15.8 — Async Function Definitions
https://tc39.es/ecma262/#sec-async-function-definitions

### 5.9 Generator Functions

```sjs
function* range(start: number, end: number): Generator<number> {
  for (let i = start; i < end; i++) {
    yield i
  }
}

for (const n of range(0, 5)) {
  console.log(n)   // 0, 1, 2, 3, 4
}
```

**Reference**: ECMA-262 §15.5 — Generator Function Definitions
https://tc39.es/ecma262/#sec-generator-function-definitions

---

## 6. Classes

### 6.1 Class Syntax

SJS uses ES2022 class syntax as the base, extended with type annotations.

**Reference**: ECMA-262 §15.7 — Class Definitions
https://tc39.es/ecma262/#sec-class-definitions

```sjs
class Person {
  name: string
  age: number

  constructor(name: string, age: number) {
    this.name = name
    this.age = age
  }

  greet(): string {
    return `Hi, I'm ${this.name}`
  }
}
```

### 6.2 Private Fields

SJS uses the ECMAScript standard `#private` field syntax (ES2022). TypeScript-style `private` keyword is **accepted** for gradual migration but is not enforced at runtime (it is a compile-time-only annotation).

**Reference**: ECMA-262 §15.7.1 — Class Elements; §7.3.5 — PrivateElementFind
https://tc39.es/ecma262/#sec-privateelementfind

```sjs
class BankAccount {
  #balance: number = 0        // ES2022 private field — enforced at runtime
  private owner: string       // SJS compile-time private — NOT enforced at runtime

  constructor(owner: string, initialBalance: number) {
    this.owner = owner
    this.#balance = initialBalance
  }

  deposit(amount: number): void {
    if (amount <= 0) throw new Error("Amount must be positive")
    this.#balance += amount
  }

  get balance(): number {
    return this.#balance
  }
}

const account = new BankAccount("Alice", 100)
account.#balance           // SJS-E012 — cannot access private field '#balance'
account.owner              // SJS-W006 — 'owner' is declared private (compile-time only)
```

**Non-normative note**: Prefer `#private` for true encapsulation enforced at runtime. The `private` keyword is provided for TypeScript compatibility during migration but generates `SJS-W006`.

### 6.3 Class Property Annotations

Class properties may be annotated with types:

```sjs
class Config {
  host: string = "localhost"
  port: number = 3000
  debug: boolean = false
  tags: string[] = []
  metadata: { [key: string]: string } = {}
}
```

**Definite assignment**: If a property is declared without a default and the constructor does not assign it, `SJS-E013` is produced (property may be uninitialized).

```sjs
class Bad {
  name: string     // SJS-E013 — property 'name' declared but never initialized
  constructor() {} // constructor doesn't assign this.name
}

class Good {
  name: string
  constructor(name: string) {
    this.name = name    // ok
  }
}
```

### 6.4 Class Inheritance

```sjs
class Animal {
  name: string

  constructor(name: string) {
    this.name = name
  }

  speak(): string {
    return `${this.name} makes a sound`
  }
}

class Dog extends Animal {
  breed: string

  constructor(name: string, breed: string) {
    super(name)
    this.breed = breed
  }

  speak(): string {
    return `${this.name} barks`
  }

  fetch(item: string): void {
    console.log(`${this.name} fetches ${item}`)
  }
}
```

**Reference**: ECMA-262 §15.7.5 — Runtime Semantics: ClassDefinitionEvaluation
https://tc39.es/ecma262/#sec-runtime-semantics-classdefinitionevaluation

**Covariance rule**: A subclass method may narrow the return type. A subclass method must not widen the parameter types (Liskov Substitution Principle). Violations produce `SJS-E014`.

### 6.5 Static Members

```sjs
class MathUtils {
  static PI: number = 3.14159265358979
  static readonly E: number = 2.71828182845904

  static circleArea(r: number): number {
    return MathUtils.PI * r * r
  }

  static #instanceCount: number = 0    // private static field

  static getInstanceCount(): number {
    return MathUtils.#instanceCount
  }
}
```

### 6.6 Abstract Classes (Phase 2+)

Abstract classes are planned for Phase 2. The syntax is:

```sjs
abstract class Shape {
  abstract area(): number
  abstract perimeter(): number

  describe(): string {
    return `Area: ${this.area()}, Perimeter: ${this.perimeter()}`
  }
}

class Circle extends Shape {
  constructor(private radius: number) { super() }

  area(): number { return Math.PI * this.radius ** 2 }
  perimeter(): number { return 2 * Math.PI * this.radius }
}
```

Abstract class support is tracked for Phase 2 implementation.

### 6.7 Getters and Setters

```sjs
class Temperature {
  #celsius: number = 0

  get fahrenheit(): number {
    return this.#celsius * 9/5 + 32
  }

  set fahrenheit(f: number) {
    this.#celsius = (f - 32) * 5/9
  }

  get celsius(): number { return this.#celsius }
  set celsius(c: number) { this.#celsius = c }
}
```

**Reference**: ECMA-262 §15.7.1 — Method Definitions (get/set)
https://tc39.es/ecma262/#sec-method-definitions

---

## 7. Modules

### 7.1 ES Modules

SJS fully supports the ES Module system from ECMA-262 §16.

**Reference**: ECMA-262 §16 — ECMAScript Language: Scripts and Modules
https://tc39.es/ecma262/#sec-modules

#### 7.1.1 Named Exports

```sjs
export const PI: number = 3.14159
export function add(a: number, b: number): number { return a + b }
export class Calculator { /* ... */ }
export interface MathOperation { (a: number, b: number): number }
export type Point = { x: number; y: number }
```

#### 7.1.2 Default Export

```sjs
export default function main(): void {
  console.log("Hello from main")
}

// Or:
const app = new Application()
export default app
```

#### 7.1.3 Re-exports

```sjs
export { add, subtract } from "./math"
export { default as Calculator } from "./calculator"
export * from "./utils"
export * as MathUtils from "./math"
```

#### 7.1.4 Named Imports

```sjs
import { add, subtract } from "./math"
import { type Point } from "./geometry"   // type-only import — erased at compile time
import * as Math from "./math"
import Calculator from "./calculator"
```

**Type-only imports** (`import { type X }`): Imported as a type only; not included in runtime output. Useful for avoiding circular import issues when only the type is needed.

### 7.2 CommonJS Interoperability

SJS accepts CommonJS-style `require()` and `module.exports` syntax for backward compatibility with existing Node.js code.

```sjs
const fs = require("fs")
const path = require("path")
module.exports = { add, subtract }
```

**CJS Typing rule**: All `require()` calls return type `dynamic` unless the required module is itself a typed `.sjs` file. CJS interoperability is intentionally untyped to avoid false errors in JavaScript-heavy codebases.

### 7.3 `.js` Import Rule

When a `.sjs` file imports a `.js` file (plain JavaScript), the import is accepted without type errors. All exported values from `.js` files have type `dynamic`.

```sjs
import { helper } from "./legacy.js"   // ok — helper: dynamic
```

**FR-008 compliance**: The compiler MUST accept `.js` imports and assign `dynamic` to all imported bindings.

### 7.4 Circular Import Detection

If a cycle is detected in the static import graph, the compiler reports `SJS-E004` and refuses to compile any file in the cycle.

```
error[SJS-E004]: Circular import detected
  --> a.sjs:1:1
   |
 1 | import { something } from "./b.sjs"
   |                           ^^^^^^^^
   |
   = note: b.sjs imports a.sjs
   = help: Break the cycle by extracting shared code to a third module.
```

**Reference**: ECMA-262 §16.2.1.5.3 — InnerModuleEvaluation (cycle handling)
https://tc39.es/ecma262/#sec-innermoduleevaluation

### 7.5 Module Resolution

SJS resolves module specifiers using the following algorithm (in order):

1. Exact path with `.sjs` extension.
2. Exact path with `.js` extension (treated as untyped).
3. Path with `/index.sjs` appended.
4. Path with `/index.js` appended.
5. `node_modules/` lookup (package main field).

Bare specifiers (e.g., `"react"`, `"lodash"`) resolve through `node_modules/` using the standard Node.js resolution algorithm.

---

## 8. JSX

### 8.1 Overview

JSX is enabled by default in all `.sjs` files. No pragma comment or configuration is required.

**Reference**: JSX Draft Specification — https://facebook.github.io/jsx/

**Compilation**: JSX expressions are transformed to factory function calls. The factory and fragment are configurable.

### 8.2 Default JSX Factory

| Setting | Default Value | Description |
|---------|--------------|-------------|
| `jsxFactory` | `sjs.createElement` | Called for every JSX element |
| `jsxFragment` | `sjs.Fragment` | Used for `<>...</>` fragments |

The defaults use the `sjs` namespace. For React projects, set `jsxFactory: "React.createElement"` and `jsxFragment: "React.Fragment"` in `superjs.config.json`.

### 8.3 JSX Elements

```sjs
// Intrinsic element (lowercase — maps to HTML tag)
const div = <div className="container">Hello</div>

// Component element (uppercase — calls the component function)
const button = <MyButton onClick={handleClick} disabled={false} />

// Element with children
const card = (
  <Card title="My Card">
    <p>Card content</p>
  </Card>
)

// Spread attributes
const merged = <Component {...props} extra="value" />
```

**Compilation output** (with default factory):

```js
// JSX: <div className="container">Hello</div>
sjs.createElement("div", { className: "container" }, "Hello")

// JSX: <MyButton onClick={handleClick} disabled={false} />
sjs.createElement(MyButton, { onClick: handleClick, disabled: false })

// JSX: <Card title="My Card"><p>Card content</p></Card>
sjs.createElement(Card, { title: "My Card" },
  sjs.createElement("p", null, "Card content")
)
```

### 8.4 JSX Fragments

```sjs
// Short form
const items = (
  <>
    <li>First</li>
    <li>Second</li>
    <li>Third</li>
  </>
)

// Explicit form
const more = (
  <sjs.Fragment>
    <span>A</span>
    <span>B</span>
  </sjs.Fragment>
)
```

**Compilation output**:

```js
sjs.createElement(sjs.Fragment, null,
  sjs.createElement("li", null, "First"),
  sjs.createElement("li", null, "Second"),
  sjs.createElement("li", null, "Third")
)
```

### 8.5 Typed JSX Props

JSX component props are type-checked when the component function has typed parameters:

```sjs
interface ButtonProps {
  label: string
  onClick: () => void
  disabled?: boolean
  variant?: "primary" | "secondary" | "danger"
}

function Button({ label, onClick, disabled = false, variant = "primary" }: ButtonProps) {
  return (
    <button
      className={`btn btn-${variant}`}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  )
}

// Type-checked at call site:
const b1 = <Button label="Click" onClick={() => {}} />           // ok
const b2 = <Button label={42} onClick={() => {}} />              // SJS-E003 — label: string expected, got number
const b3 = <Button label="OK" onClick={() => {}} variant="warning" />  // SJS-E003 — "warning" not in union
```

**SJS-E005 (Missing required JSX prop)**:

```sjs
const bad = <Button onClick={() => {}} />  // SJS-E005 — missing required prop 'label'
```

### 8.6 JSX Children Types

JSX children are typed as `SjsNode` (equivalent to `React.ReactNode` in React projects):

```sjs
type SjsNode =
  | string
  | number
  | boolean
  | null
  | undefined
  | SjsElement
  | SjsNode[]

type SjsElement = {
  type: string | Function
  props: { [key: string]: dynamic }
  key: string | null
}
```

### 8.7 JSX Configuration

In `superjs.config.json`:

```json
{
  "jsxFactory": "React.createElement",
  "jsxFragment": "React.Fragment"
}
```

Or per-file with a pragma comment (accepted for compatibility with existing tooling; not required):

```sjs
/* @jsxRuntime classic */
/* @jsx h */
/* @jsxFrag Fragment */
import { h, Fragment } from "preact"
```

---

## 9. Pattern Matching

### 9.1 Overview

The `match` expression provides exhaustive pattern matching over sum types, union types, and primitive values. It is similar to `switch` but is an expression (has a value), requires exhaustiveness, and supports destructuring.

**Reference**: No ECMA-262 analogue (this is a SJS-specific extension). The semantics are defined relative to ECMA-262 §13.12 — The `switch` Statement for the underlying dispatch behavior.
https://tc39.es/ecma262/#sec-switch-statement

### 9.2 Syntax

```
MatchExpression ::= "match" "(" Expression ")" "{" MatchArm+ "}"
MatchArm        ::= Pattern "=>" Expression ","
                 | Pattern "=>" Block ","
                 | Pattern "if" Expression "=>" Expression ","  // guarded
                 | "_" "=>" Expression ","                      // wildcard

Pattern ::=
    LiteralPattern
  | IdentifierPattern
  | SumVariantPattern
  | TuplePattern
  | ObjectPattern
  | WildcardPattern
  | OrPattern

SumVariantPattern ::= Identifier "(" PatternList[opt] ")"
OrPattern         ::= Pattern "|" Pattern
LiteralPattern    ::= NumericLiteral | StringLiteral | BooleanLiteral | "null"
WildcardPattern   ::= "_"
IdentifierPattern ::= Identifier  (binds the matched value to a name)
```

### 9.3 Matching Sum Types

```sjs
type Result<T> = Ok(T) | Err(string)

function unwrap<T>(r: Result<T>): T {
  return match (r) {
    Ok(value) => value,
    Err(msg)  => { throw new Error(msg) },
  }
}

// Nested patterns:
type Tree<T> = Leaf | Node(T, Tree<T>, Tree<T>)

function depth<T>(t: Tree<T>): number {
  return match (t) {
    Leaf            => 0,
    Node(_, l, r)  => 1 + Math.max(depth(l), depth(r)),
  }
}
```

### 9.4 Matching Union Types

```sjs
type Status = "pending" | "active" | "closed"

function describe(s: Status): string {
  return match (s) {
    "pending" => "Waiting to start",
    "active"  => "Currently running",
    "closed"  => "Finished",
  }
}
```

### 9.5 Matching Primitive Values

```sjs
function classify(n: number): string {
  return match (n) {
    0  => "zero",
    1  => "one",
    _  => "many",
  }
}
```

### 9.6 Guard Clauses

An `if` guard adds an additional condition to an arm. The arm matches only when both the pattern and the guard are satisfied:

```sjs
function evaluate(n: number): string {
  return match (n) {
    x if x < 0   => "negative",
    x if x === 0 => "zero",
    x if x > 100 => "large",
    _            => "small positive",
  }
}
```

### 9.7 Or Patterns

Multiple patterns can match a single arm using `|`:

```sjs
type Day = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun"

function isWeekend(d: Day): boolean {
  return match (d) {
    "Sat" | "Sun" => true,
    _             => false,
  }
}
```

### 9.8 Object Patterns

```sjs
interface Point { x: number; y: number }

function quadrant(p: Point): string {
  return match (p) {
    { x, y } if x > 0 && y > 0 => "I",
    { x, y } if x < 0 && y > 0 => "II",
    { x, y } if x < 0 && y < 0 => "III",
    { x, y } if x > 0 && y < 0 => "IV",
    _                           => "origin or axis",
  }
}
```

### 9.9 Exhaustiveness Checking

The SJS compiler requires `match` expressions to be *exhaustive*: every possible value must be covered by at least one arm. A non-exhaustive match produces `SJS-E015`.

```sjs
type Color = Red | Green | Blue

function name(c: Color): string {
  return match (c) {
    Red   => "red",
    Green => "green",
    // SJS-E015 — match is not exhaustive: missing 'Blue'
  }
}
```

The wildcard `_` pattern is always exhaustive:

```sjs
function name(c: Color): string {
  return match (c) {
    Red => "red",
    _   => "other",    // ok — catches Green and Blue
  }
}
```

### 9.10 Match as Expression

`match` is an expression — it evaluates to a value. All arms must have compatible types, or the result type is the union of arm types:

```sjs
const label: string = match (code) {
  200 => "OK",
  404 => "Not Found",
  500 => "Internal Server Error",
  _   => `Unknown (${code})`,
}
```

### 9.11 Compiled Output (Phase 1)

`match` compiles to a JavaScript `switch` or `if-else` chain. The exact form depends on the pattern types:

```sjs
// SJS source
const result = match (status) {
  "pending" => 0,
  "active"  => 1,
  "closed"  => 2,
}
```

```js
// Compiled JavaScript
let result;
switch (status) {
  case "pending": result = 0; break;
  case "active":  result = 1; break;
  case "closed":  result = 2; break;
  default: throw new Error("Non-exhaustive match");
}
```

For sum types:

```sjs
// SJS source
const val = match (r) {
  Ok(v)  => v,
  Err(e) => { throw new Error(e) },
}
```

```js
// Compiled JavaScript
let val;
switch (r._tag) {
  case "Ok":  val = r._0; break;
  case "Err": throw new Error(r._0);
  default: throw new Error("Non-exhaustive match: " + r._tag);
}
```

---

## 10. Error Handling and Diagnostics

### 10.1 Diagnostic Model

Every SJS compiler error, warning, and lint violation is a *diagnostic* with the following structure:

```
Diagnostic {
  code:        string         // e.g., "SJS-E001"
  severity:    "error" | "warning" | "note" | "help"
  message:     string         // first-person, plain English
  file:        string         // absolute source path
  line:        number         // 1-based
  column:      number         // 0-based
  endLine:     number         // 1-based
  endColumn:   number         // 0-based
  suggestion?: { description: string; replacement: string }
  notes:       Diagnostic[]   // related child diagnostics
  docsUrl:     string         // https://superjs.dev/errors/<CODE>
}
```

**Diagnostic principles** (from research.md §3):
1. Most specific information first — lead with the exact token/span.
2. Conversational, non-blaming tone — first person; Elm model.
3. Always include a help or suggestion if an auto-fix exists.
4. Stable, permanent error codes — codes are never reused.

### 10.2 Human-Readable Format

```
error[SJS-E001]: I cannot assign a value of type 'string' to a variable declared as 'number'.
  --> src/app.sjs:12:18
    |
 12 |   let x: number = "hello"
    |                   ^^^^^^^ string is not assignable to number
    |
    = help: Change the value to a number, or change the type annotation to 'string'.
    = docs: https://superjs.dev/errors/SJS-E001
    = spec: https://tc39.es/ecma262/#sec-let-and-const-declarations
```

### 10.3 JSON Format (`--json`)

Each diagnostic is emitted as one JSON object per line (NDJSON), SARIF-compatible:

```json
{
  "code": "SJS-E001",
  "severity": "error",
  "message": "I cannot assign a value of type 'string' to a variable declared as 'number'.",
  "file": "/abs/path/src/app.sjs",
  "line": 12,
  "column": 18,
  "endLine": 12,
  "endColumn": 25,
  "suggestion": {
    "description": "Change the value to a number",
    "replacement": "42"
  },
  "notes": [],
  "docsUrl": "https://superjs.dev/errors/SJS-E001"
}
```

### 10.4 Error Codes (SJS-E)

Error codes are permanent. A code that was assigned to a rule is never reassigned to a different rule, even if the original rule is deprecated.

| Code | Name | Description | Spec Anchor |
|------|------|-------------|-------------|
| **SJS-E001** | Type mismatch | The value is not consistent with the declared type. Gradual typing allows `dynamic` on either side. | [ECMA-262 §14.3.1](https://tc39.es/ecma262/#sec-let-and-const-declarations) |
| **SJS-E002** | Return type mismatch | The returned expression is not consistent with the function's declared return type, or a return value is missing. | [ECMA-262 §15.2](https://tc39.es/ecma262/#sec-function-definitions) |
| **SJS-E003** | Argument type mismatch | A call-site argument is not consistent with the parameter's declared type, or a required argument is missing. | [ECMA-262 §13.3.8.1](https://tc39.es/ecma262/#sec-evaluatecall) |
| **SJS-E004** | Circular import | A cycle was detected in the static import graph. | [ECMA-262 §16.2.1.5.3](https://tc39.es/ecma262/#sec-innermoduleevaluation) |
| **SJS-E005** | Missing required JSX prop | A JSX component call is missing a required prop. | [JSX Spec §JSXOpeningElement](https://facebook.github.io/jsx/) |
| **SJS-E006** | Unknown type name | A type annotation references a name not in scope. | [ECMA-262 §9.1](https://tc39.es/ecma262/#sec-environment-records) |
| **SJS-E007** | Const reassignment | A `const` binding was assigned after initialization. | [ECMA-262 §14.3.1](https://tc39.es/ecma262/#sec-let-and-const-declarations) |
| **SJS-E008** | Excess property | An object literal has a property not in the target type. | [ECMA-262 §6.1.7](https://tc39.es/ecma262/#sec-object-type) |
| **SJS-E009** | Unknown variant | A sum type variant name is not declared in the sum type. | SJS §3.10 |
| **SJS-E010** | Banned type construct | A TypeScript feature banned in SJS was used (`any`, mapped types, conditional types, etc.). | SJS §3.17 |
| **SJS-E011** | Required after optional parameter | A required parameter appears after an optional parameter. | [ECMA-262 §15.2.3](https://tc39.es/ecma262/#sec-function-definitions) |
| **SJS-E012** | Private field access | Attempted access to an ES2022 `#private` field from outside the class. | [ECMA-262 §7.3.5](https://tc39.es/ecma262/#sec-privateelementfind) |
| **SJS-E013** | Uninitialized property | A class property is declared with a type but never initialized. | [ECMA-262 §15.7.1](https://tc39.es/ecma262/#sec-class-definitions) |
| **SJS-E014** | Method signature mismatch | A subclass method violates the Liskov Substitution Principle (e.g., widens parameter types). | SJS §6.4 |
| **SJS-E015** | Non-exhaustive match | A `match` expression does not cover all possible values of the matched type. | SJS §9.9 |
| **SJS-E016** | Null dereference | A nullable value (`T?`) is used where a non-null value is required. | SJS §3.4 |
| **SJS-E017** | Invalid sum type construction | Incorrect number or type of arguments to a sum type variant constructor. | SJS §3.10 |
| **SJS-E018** | Generic constraint violation | A type argument does not satisfy the type parameter's constraint. | SJS §3.12.2 |
| **SJS-E019** | Missing return | Not all code paths in a function return a value, but the function has a non-void return type annotation. | [ECMA-262 §15.2](https://tc39.es/ecma262/#sec-function-definitions) |
| **SJS-E020** | Undeclared identifier | An identifier is used but not declared in any enclosing scope. | [ECMA-262 §9.1.1.1](https://tc39.es/ecma262/#sec-declarative-environment-records) |

### 10.5 Warning Codes (SJS-W)

Warnings do not prevent compilation. They indicate code that is valid but potentially problematic.

| Code | Name | Description | Activation |
|------|------|-------------|-----------|
| **SJS-W001** | Implicit dynamic | A position lacks a type annotation and implicitly receives `dynamic`. In gradual mode this is silent; in strict mode it is a warning. | `--strict` |
| **SJS-W002** | Unused variable | A declared variable (except `_`-prefixed names) is never read after assignment. | Always |
| **SJS-W003** | Unused import | An import binding is never referenced in the file. | Always |
| **SJS-W004** | Unreachable code | Code appears after a `return`, `throw`, or infinite loop. | Always |
| **SJS-W005** | Ambiguous identifier | An identifier name matches an SJS contextual keyword and may cause confusion. | Always |
| **SJS-W006** | TypeScript-style private | The `private` keyword is used instead of `#private`. Runtime encapsulation is not guaranteed. | Always |
| **SJS-W007** | Non-null assertion | The non-null assertion operator `x!` is used. (Imported from TypeScript-style code.) | Always |
| **SJS-W008** | Implicit return undefined | An async or generator function implicitly returns `undefined` in some paths. | `--strict` |

#### SJS-W001 Example

```sjs
// superjs build --strict
let count = 0
// warning[SJS-W001]: 'count' implicitly has type 'dynamic' because it lacks a type annotation.
//   help: Add ': number' to make the type explicit.

function add(a, b) { return a + b }
// warning[SJS-W001]: Parameter 'a' implicitly has type 'dynamic' because it lacks a type annotation.
// warning[SJS-W001]: Parameter 'b' implicitly has type 'dynamic' because it lacks a type annotation.
```

#### SJS-W002 Example

```sjs
function compute(): number {
  let temp = expensiveCalc()  // warning[SJS-W002]: 'temp' is declared but never used.
  return 42
}
```

#### SJS-W003 Example

```sjs
import { unused } from "./utils"  // warning[SJS-W003]: 'unused' is imported but never used.
```

### 10.6 Lint Codes (SJS-L)

Lint codes represent style or best-practice violations. They can be auto-fixed with `superjs lint --fix`.

| Code | Name | Description | Auto-fix |
|------|------|-------------|----------|
| **SJS-L001** | Prefer const | A `let` binding is never reassigned; `const` should be used. | Yes — rewrites `let` to `const` |
| **SJS-L002** | Prefer arrow function | A named function expression used as a callback could be an arrow function. | Yes |
| **SJS-L003** | No var | `var` was used; prefer `let` or `const`. | Yes |
| **SJS-L004** | No unused labels | A statement label is never referenced by `break` or `continue`. | Yes — removes label |
| **SJS-L005** | Consistent return | A function has both bare `return` and `return value` statements. | No |
| **SJS-L006** | Prefer template literals | String concatenation with `+` could use a template literal. | Yes |
| **SJS-L007** | No magic numbers | A numeric literal other than 0 or 1 appears in arithmetic without a named constant. | No |

#### SJS-L001 Example

```sjs
let PI = 3.14159   // never reassigned
// warning[SJS-L001]: 'PI' is never reassigned. Use 'const' instead of 'let'.
//   help: Change 'let' to 'const'.
```

---

## 11. Compiler Pipeline

### 11.1 Pipeline Overview

The SJS compiler processes a source file through five sequential stages:

```
.sjs source text
      |
      v
   [LEXER] ─── produces ──→ Token[]
      |
      v
   [PARSER] ─── produces ──→ AST (Program node)
      |
      v
  [TYPE CHECKER] ─── produces ──→ Typed AST + Diagnostic[]
      |
      v (if no errors)
   [EMITTER] ─── produces ──→ .js source text
      |
      v (if --sourcemap)
[SOURCEMAP GEN] ─── produces ──→ .js.map
```

### 11.2 Lexer

Converts source text to a flat `Token[]` sequence.

**Token types**:
- `IDENTIFIER` — user-defined names
- `NUMBER` — numeric literals (all forms per §2.8.1)
- `STRING` — string literals (double, single, template)
- `KEYWORD` — reserved words
- `SJS_KEYWORD` — `type`, `interface`, `match`, `dynamic`
- `PUNCTUATOR` — operators and delimiters
- `JSX_TAG_OPEN` — `<TagName`
- `JSX_TAG_CLOSE` — `</TagName>`
- `JSX_SELF_CLOSE` — `/>`
- `COMMENT` — preserved for JSDoc extraction
- `EOF` — end of input

**Phase**: Contextual keywords (`type`, `interface`, `match`, `dynamic`) are classified as `IDENTIFIER` by the lexer and promoted to `SJS_KEYWORD` by the parser based on context.

### 11.3 Parser

Converts `Token[]` to an AST compatible with Babel's AST format (for Phase 1 compatibility).

The parser uses **recursive descent** with top-down operator precedence (Pratt parsing) for expressions.

**Key SJS-specific AST nodes** (additions to standard ESTree/Babel AST):

| Node | Fields | Description |
|------|--------|-------------|
| `TypeAnnotation` | `typeAnnotation: TSType` | Type annotation on a binding |
| `TSTypeAnnotation` | (Babel compat) | Babel-compatible wrapper |
| `TypeAlias` | `id, typeParameters, right` | `type X = ...` |
| `InterfaceDeclaration` | `id, typeParameters, extends, body` | `interface X {...}` |
| `SumTypeDeclaration` | `id, typeParameters, variants` | `type X = A(...) \| B(...)` |
| `MatchExpression` | `discriminant, arms` | `match (x) { ... }` |
| `MatchArm` | `pattern, guard, body` | One arm of `match` |
| `SumVariantPattern` | `name, params` | `Ok(value)` in a pattern |

### 11.4 Type Checker

The type checker implements bidirectional type checking (§3.1) over the parsed AST.

**Two modes**:
1. **Synthesis** (`infer`): Given an expression, produce its type.
2. **Checking** (`check`): Given an expression and an expected type, verify consistency.

**Algorithm**:

```
infer(expr) -> Type
  | Literal(n)          -> number
  | Literal(s)          -> string
  | Literal(b)          -> boolean
  | Literal(null)       -> null
  | Ident(x)            -> env.lookup(x) ?? dynamic
  | Call(f, args)       -> inferCall(f, args)
  | ArrowFn(params, body) -> inferArrow(params, body)
  | BinaryExpr(+, l, r) -> inferBinary(+, l, r)
  | JSX(tag, props, ch) -> SjsElement

check(expr, expected) -> Diagnostic[]
  | expr                -> let t = infer(expr)
                           if !consistent(t, expected) then [SJS-E001]
                           else []

consistent(t1, t2) -> boolean
  | (dynamic, _)        -> true
  | (_, dynamic)        -> true
  | (T, T)              -> true
  | (T, A | B)          -> consistent(T, A) || consistent(T, B)
  | (A | B, T)          -> consistent(A, T) && consistent(B, T)
  | (ObjectType A, ObjectType B) -> all required props of B in A with consistent types
  | _                   -> false
```

### 11.5 Emitter

The emitter performs **type erasure** and produces JavaScript output:

- All type annotations (`: Type`, `<T>`, `type` declarations, `interface` declarations) are removed.
- All `match` expressions are compiled to `switch`/`if-else` chains.
- All sum type variant constructions `Ok(v)` become `{ _tag: "Ok", _0: v }`.
- JSX elements are transformed to factory calls.
- Target-specific downleveling is applied (e.g., `async/await` to generator or promise chains for ES5/ES2015 targets).

### 11.6 Incremental Compilation

The build cache (`superjs.buildinfo`) stores:

```json
{
  "version": "0.1.0",
  "target": "es2022",
  "files": {
    "/abs/path/src/app.sjs": {
      "contentHash": "sha256:abc...",
      "outputHash": "sha256:def...",
      "imports": ["/abs/path/src/utils.sjs"],
      "diagnostics": []
    }
  }
}
```

On each build, the compiler:

1. Hashes each source file.
2. Compares hash to cached value.
3. Marks files with changed hashes as *dirty*.
4. Walks the reverse-import graph to find all files transitively affected by dirty files.
5. Compiles dirty files in topological order (Kahn's algorithm).
6. Skips files whose hash and all dependencies are unchanged.

**Watch mode debounce**: Editor saves within a 100ms window are coalesced into a single recompilation pass.

### 11.7 Project Configuration

`superjs.config.json` (or `superjs.config.js` for dynamic configuration):

```json
{
  "$schema": "https://superjs.dev/schemas/config-v1.json",
  "target": "es2022",
  "outDir": "dist",
  "rootDir": "src",
  "jsxFactory": "React.createElement",
  "jsxFragment": "React.Fragment",
  "strict": false,
  "sourcemap": false,
  "include": ["**/*.sjs"],
  "exclude": ["node_modules", "dist"],
  "lintRules": {
    "SJS-L001": "warn",
    "SJS-L003": "error",
    "SJS-L007": "off"
  }
}
```

All fields are optional; the defaults shown above apply when fields are absent.

---

## 12. EBNF Grammar Appendix

This appendix provides a formal Extended Backus-Naur Form (EBNF) grammar for SJS-specific syntactic extensions. The base ECMAScript grammar is inherited from ECMA-262 and is not reproduced here.

**Notation**:
- `A ::= B` — definition
- `[ A ]` — zero or one occurrences of A
- `{ A }` — zero or more occurrences of A
- `A+` — one or more occurrences of A
- `A | B` — alternation
- `"literal"` — terminal
- `(A B)` — grouping

### 12.1 Top-Level SJS Additions

```ebnf
SJSDeclaration ::=
    TypeAliasDeclaration
  | InterfaceDeclaration
  | SumTypeDeclaration

TypeAliasDeclaration ::=
    "type" Identifier [ TypeParameters ] "=" Type ";"?

InterfaceDeclaration ::=
    "interface" Identifier [ TypeParameters ] [ ExtendsList ] InterfaceBody

InterfaceBody ::=
    "{" { InterfaceMember } "}"

InterfaceMember ::=
    PropertySignature
  | MethodSignature
  | IndexSignature
  | ConstructorSignature

SumTypeDeclaration ::=
    "type" Identifier [ TypeParameters ] "=" SumVariant { "|" SumVariant } ";"?

SumVariant ::=
    Identifier "(" [ TypeList ] ")"
  | Identifier
```

### 12.2 Type Expressions

```ebnf
Type ::=
    PrimaryType
  | UnionType
  | IntersectionType
  | FunctionType
  | NullableType

PrimaryType ::=
    PredefinedType
  | TypeReference
  | ObjectType
  | ArrayType
  | TupleType
  | ParenthesizedType
  | LiteralType

PredefinedType ::=
    "number"
  | "string"
  | "boolean"
  | "symbol"
  | "bigint"
  | "void"
  | "never"
  | "null"
  | "undefined"
  | "dynamic"
  | "object"

TypeReference ::=
    Identifier [ TypeArguments ]

TypeArguments ::=
    "<" Type { "," Type } ">"

ObjectType ::=
    "{" { TypeMember ";"? } "}"

TypeMember ::=
    PropertySignature
  | IndexSignature
  | MethodSignature

PropertySignature ::=
    [ "readonly" ] Identifier [ "?" ] ":" Type

IndexSignature ::=
    "[" Identifier ":" ( "string" | "number" ) "]" ":" Type

MethodSignature ::=
    Identifier [ "?" ] [ TypeParameters ] "(" [ ParameterList ] ")" ":" Type

ArrayType ::=
    PrimaryType "[" "]"

TupleType ::=
    "[" Type { "," Type } [ "," ] "]"

NullableType ::=
    PrimaryType "?"

UnionType ::=
    Type { "|" Type }

IntersectionType ::=
    Type { "&" Type }

FunctionType ::=
    "(" [ ParameterTypeList ] ")" "=>" Type

ParameterTypeList ::=
    ParameterType { "," ParameterType }

ParameterType ::=
    Identifier [ "?" ] ":" Type
  | "..." Identifier ":" ArrayType

ParenthesizedType ::=
    "(" Type ")"

LiteralType ::=
    NumericLiteral
  | StringLiteral
  | BooleanLiteral
  | "null"
  | "undefined"
```

### 12.3 Type Parameter Declarations

```ebnf
TypeParameters ::=
    "<" TypeParameter { "," TypeParameter } ">"

TypeParameter ::=
    Identifier [ ":" Type ] [ "=" Type ]

ExtendsList ::=
    "extends" Identifier { "," Identifier }
```

### 12.4 Extended Variable Declarations

```ebnf
TypedVariableDeclaration ::=
    ( "const" | "let" | "var" ) TypedVariableDeclarator { "," TypedVariableDeclarator }

TypedVariableDeclarator ::=
    BindingPattern [ ":" Type ] [ "=" Expression ]
  | Identifier [ ":" Type ] [ "=" Expression ]

BindingPattern ::=
    ObjectBindingPattern
  | ArrayBindingPattern

ObjectBindingPattern ::=
    "{" { BindingProperty "," } [ RestBindingProperty ] "}"

BindingProperty ::=
    Identifier [ "?" ] [ ":" Type ] [ "=" Expression ]
  | Identifier ":" BindingPattern [ "=" Expression ]

ArrayBindingPattern ::=
    "[" { [ BindingElement ] "," } [ BindingElement ] "]"

BindingElement ::=
    Identifier [ ":" Type ] [ "=" Expression ]
  | BindingPattern [ "=" Expression ]
```

### 12.5 Extended Function Declarations

```ebnf
TypedFunctionDeclaration ::=
    [ "async" ] "function" [ "*" ] Identifier [ TypeParameters ]
    "(" [ TypedParameterList ] ")" [ ":" Type ]
    FunctionBody

TypedParameterList ::=
    TypedParameter { "," TypedParameter }

TypedParameter ::=
    Identifier [ "?" ] [ ":" Type ] [ "=" Expression ]
  | "..." Identifier ":" ArrayType

TypedArrowFunction ::=
    [ "async" ] TypedArrowParameters "=>" ( Expression | FunctionBody )

TypedArrowParameters ::=
    Identifier [ ":" Type ]
  | "(" [ TypedParameterList ] ")" [ ":" Type ]
  | "(" [ TypedParameterList ] ")" ":" Type
```

### 12.6 Extended Class Declarations

```ebnf
TypedClassDeclaration ::=
    [ "abstract" ] "class" Identifier [ TypeParameters ]
    [ "extends" TypeReference ]
    [ "implements" TypeReference { "," TypeReference } ]
    TypedClassBody

TypedClassBody ::=
    "{" { TypedClassElement } "}"

TypedClassElement ::=
    TypedMethodDefinition
  | TypedFieldDefinition
  | TypedPrivateFieldDefinition
  | StaticBlock

TypedFieldDefinition ::=
    [ "static" ] [ "readonly" ] Identifier [ "?" ] [ ":" Type ] [ "=" Expression ]

TypedPrivateFieldDefinition ::=
    [ "static" ] [ "readonly" ] PrivateName [ ":" Type ] [ "=" Expression ]

TypedMethodDefinition ::=
    [ "static" ] [ "async" ] [ "*" ] [ "get" | "set" ]
    ( Identifier | PrivateName ) [ TypeParameters ]
    "(" [ TypedParameterList ] ")" [ ":" Type ]
    FunctionBody

PrivateName ::=
    "#" Identifier
```

### 12.7 Match Expression

```ebnf
MatchExpression ::=
    "match" "(" Expression ")" "{" MatchArm+ "}"

MatchArm ::=
    Pattern [ "if" Expression ] "=>" MatchBody ","?

MatchBody ::=
    Expression
  | Block

Pattern ::=
    WildcardPattern
  | LiteralPattern
  | IdentifierPattern
  | SumVariantPattern
  | TuplePattern
  | ObjectPattern
  | OrPattern
  | NullPattern
  | UndefinedPattern

WildcardPattern    ::= "_"
LiteralPattern     ::= NumericLiteral | StringLiteral | BooleanLiteral
IdentifierPattern  ::= Identifier
NullPattern        ::= "null"
UndefinedPattern   ::= "undefined"

SumVariantPattern  ::=
    Identifier "(" [ Pattern { "," Pattern } ] ")"

TuplePattern ::=
    "[" Pattern { "," Pattern } "]"

ObjectPattern ::=
    "{" { ObjectPatternProperty "," } "}"

ObjectPatternProperty ::=
    Identifier [ ":" Pattern ]
  | "..." Identifier

OrPattern ::=
    Pattern { "|" Pattern }
```

### 12.8 JSX Extensions (Inherited from JSX Spec)

The following JSX grammar is included for completeness. SJS adopts the JSX Draft Specification grammar verbatim:

```ebnf
JSXElement ::=
    JSXOpeningElement JSXChildren JSXClosingElement
  | JSXSelfClosingElement

JSXSelfClosingElement ::=
    "<" JSXElementName [ JSXAttributes ] "/>"

JSXOpeningElement ::=
    "<" JSXElementName [ JSXAttributes ] ">"

JSXClosingElement ::=
    "</" JSXElementName ">"

JSXFragment ::=
    JSXOpeningFragment JSXChildren JSXClosingFragment

JSXOpeningFragment  ::= "<>"
JSXClosingFragment  ::= "</>"

JSXElementName ::=
    JSXIdentifier
  | JSXNamespacedName
  | JSXMemberExpression

JSXAttributes ::=
    { JSXAttribute | JSXSpreadAttribute }

JSXAttribute ::=
    JSXIdentifier [ "=" JSXAttributeValue ]

JSXAttributeValue ::=
    StringLiteral
  | "{" Expression "}"
  | JSXElement
  | JSXFragment

JSXSpreadAttribute ::=
    "{" "..." Expression "}"

JSXChildren ::=
    { JSXChild }

JSXChild ::=
    JSXText
  | JSXElement
  | JSXFragment
  | "{" Expression "}"
  | "{" "..." Expression "}"
```

### 12.9 Precedence of Type Operators

Type operators have the following precedence (highest to lowest):

| Precedence | Type Operator | Associativity | Example |
|------------|--------------|---------------|---------|
| 1 (highest) | `T?` (nullable) | Postfix | `string?` |
| 2 | `T[]` (array) | Postfix | `number[]` |
| 3 | `&` (intersection) | Left | `A & B & C` |
| 4 (lowest) | `\|` (union) | Left | `A \| B \| C` |

Parentheses override precedence:

```sjs
(string | number)[]    // array of (string | number)
string | number[]      // string OR number[] — number[] takes priority
```

### 12.10 Operator Precedence Addendum

SJS inherits the complete ECMAScript operator precedence table (ECMA-262 §13) and does not add any new runtime operators.

**Reference**: ECMA-262 §13 — ECMAScript Language: Expressions
https://tc39.es/ecma262/#sec-ecmascript-language-expressions

---

## Appendix A — Formal Typing Rules

This appendix gives the full set of typing judgments for the SJS type system in standard sequent notation.

### A.1 Notation

```
Γ ⊢ e : T        — "in environment Γ, expression e has type T" (synthesis)
Γ ⊢ e ⇐ T        — "in environment Γ, expression e checks against type T"
T ~ U             — "T is consistent with U" (gradual typing)
T <: U            — "T is a subtype of U"
Γ, x : T          — environment Γ extended with binding x : T
```

### A.2 Consistency Relation

```
─────────────────── (DYN-L)        ─────────────────── (DYN-R)
  dynamic ~ T                        T ~ dynamic

──────────── (REFL)        T ~ A    T ~ B
  T ~ T               ─────────────────────── (UNION-R)
                               T ~ A | B

T ~ C    U ~ C                T ~ A    U ~ A
────────────────── (UNION-L)  ────────────────── (INT-L)
  (T | U) ~ C                    T & U ~ A
```

### A.3 Synthesis Rules

```
─────────────────────────── (NUM)
  Γ ⊢ NumericLiteral : number

─────────────────────────── (STR)
  Γ ⊢ StringLiteral : string

─────────────────────────── (BOOL)
  Γ ⊢ BooleanLiteral : boolean

─────────────────────────── (NULL)
  Γ ⊢ null : null

─────────────────────────── (UNDEF)
  Γ ⊢ undefined : undefined

   x : T ∈ Γ
────────────── (VAR)
  Γ ⊢ x : T

   x ∉ Γ
──────────────────── (VAR-DYN)  [gradual — no annotation]
  Γ ⊢ x : dynamic

  Γ ⊢ e₁ : T₁  ...  Γ ⊢ eₙ : Tₙ   T₁ ~ T  ...  Tₙ ~ T
  ──────────────────────────────────────────────────────── (ARR)
  Γ ⊢ [e₁, ..., eₙ] : T[]   (T = lub(T₁,...,Tₙ) or dynamic if unannotated)

  Γ, x₁ : T₁, ..., xₙ : Tₙ ⊢ body ⇐ R
  ─────────────────────────────────────────────────────────── (FUN)
  Γ ⊢ function(x₁:T₁,...,xₙ:Tₙ):R { body } : (T₁,...,Tₙ) → R

  Γ ⊢ f : (T₁,...,Tₙ) → R   Γ ⊢ eᵢ ⇐ Tᵢ  (for all i)
  ────────────────────────────────────────────────────────── (APP)
  Γ ⊢ f(e₁, ..., eₙ) : R

  Γ ⊢ f : dynamic
  ─────────────────────── (APP-DYN)  [gradual — callee unknown]
  Γ ⊢ f(e₁,...,eₙ) : dynamic
```

### A.4 Checking Rules

```
  Γ ⊢ e : T    T ~ U
  ─────────────────── (SUB-CHECK)
  Γ ⊢ e ⇐ U

  Γ ⊢ e : T    ¬(T ~ U)
  ─────────────────────────────── (FAIL)
  Γ ⊢ e ⇐ U   [produces SJS-E001]
```

### A.5 Structural Subtyping for Object Types

```
  for all (k : Uₖ) ∈ B:
    (k : Tₖ) ∈ A   and   Tₖ ~ Uₖ
  ──────────────────────────────── (OBJ-SUB)
         A <: B
```

---

## Appendix B — Compiler Backends Comparison

| Feature | Phase 1 (Babel) | Phase 2 (Custom JS) | Phase 3 (LLVM) |
|---------|----------------|---------------------|----------------|
| Parser | Babel | Hand-written | C++ recursive descent |
| Type checker | Bidirectional | Bidirectional | Bidirectional + monomorphization |
| Generics | Erasure | Erasure | Monomorphized |
| Output | ES5/ES2015/ES2022 | ES2022 | ES2022 + native binary (future) |
| Source maps | Yes | Planned | Yes |
| Performance | < 500ms / 1kLOC | < 200ms / 1kLOC | < 50ms / 1kLOC |
| Status | Complete | In progress | In progress |
| Sum types (Phase 1) | `{ _tag, _0, ... }` | `{ _tag, _0, ... }` | Native tagged union |
| match expression | switch/if-else | switch/if-else | Native switch |

---

## Appendix C — Standard Library Type Declarations

SJS ships built-in type declarations for the JavaScript standard library. These are compile-time only (not runtime code).

### C.1 Built-In Types

```sjs
// Global object types (simplified)
interface Console {
  log(...args: dynamic[]): void
  error(...args: dynamic[]): void
  warn(...args: dynamic[]): void
  info(...args: dynamic[]): void
  debug(...args: dynamic[]): void
}

declare const console: Console

interface Math {
  readonly PI: number
  readonly E: number
  abs(x: number): number
  ceil(x: number): number
  floor(x: number): number
  round(x: number): number
  max(...values: number[]): number
  min(...values: number[]): number
  pow(base: number, exp: number): number
  sqrt(x: number): number
  random(): number
  log(x: number): number
  sin(x: number): number
  cos(x: number): number
}

declare const Math: Math

interface JSON {
  parse(text: string): dynamic
  stringify(value: dynamic, replacer?: dynamic, space?: string | number): string
}

declare const JSON: JSON
```

### C.2 Promise Type

```sjs
interface Promise<T> {
  then<U>(onFulfilled: (value: T) => U | Promise<U>): Promise<U>
  then<U>(
    onFulfilled: (value: T) => U | Promise<U>,
    onRejected: (reason: dynamic) => U | Promise<U>
  ): Promise<U>
  catch<U>(onRejected: (reason: dynamic) => U | Promise<U>): Promise<T | U>
  finally(onFinally: () => void): Promise<T>
}

interface PromiseConstructor {
  resolve<T>(value: T | Promise<T>): Promise<T>
  reject<T>(reason: dynamic): Promise<T>
  all<T>(promises: Promise<T>[]): Promise<T[]>
  allSettled<T>(promises: Promise<T>[]): Promise<PromiseSettledResult<T>[]>
  race<T>(promises: Promise<T>[]): Promise<T>
  any<T>(promises: Promise<T>[]): Promise<T>
}

declare const Promise: PromiseConstructor

type PromiseSettledResult<T> =
  | { status: "fulfilled"; value: T }
  | { status: "rejected"; reason: dynamic }
```

### C.3 Array Type

```sjs
interface Array<T> {
  length: number
  push(...items: T[]): number
  pop(): T | undefined
  shift(): T | undefined
  unshift(...items: T[]): number
  splice(start: number, deleteCount?: number, ...items: T[]): T[]
  slice(start?: number, end?: number): T[]
  indexOf(searchElement: T, fromIndex?: number): number
  includes(searchElement: T, fromIndex?: number): boolean
  find(predicate: (value: T, index: number) => boolean): T | undefined
  findIndex(predicate: (value: T, index: number) => boolean): number
  filter(predicate: (value: T, index: number) => boolean): T[]
  map<U>(transform: (value: T, index: number) => U): U[]
  flatMap<U>(transform: (value: T, index: number) => U | U[]): U[]
  reduce<U>(reducer: (acc: U, value: T, index: number) => U, initial: U): U
  reduceRight<U>(reducer: (acc: U, value: T, index: number) => U, initial: U): U
  forEach(callback: (value: T, index: number) => void): void
  some(predicate: (value: T, index: number) => boolean): boolean
  every(predicate: (value: T, index: number) => boolean): boolean
  sort(compareFn?: (a: T, b: T) => number): T[]
  reverse(): T[]
  join(separator?: string): string
  concat(...items: (T | T[])[]): T[]
  flat<U>(depth?: number): U[]
  fill(value: T, start?: number, end?: number): T[]
  entries(): IterableIterator<[number, T]>
  keys(): IterableIterator<number>
  values(): IterableIterator<T>
  [index: number]: T
}
```

---

## Appendix D — Migration from TypeScript

Super.js is designed to be a source-compatible subset of TypeScript for the annotated features it supports. This appendix documents the required changes when migrating TypeScript (`.ts`) files to Super.js (`.sjs`).

### D.1 Changes Required

| TypeScript | SJS Equivalent | Notes |
|-----------|---------------|-------|
| `any` | `dynamic` | Rename throughout |
| `enum Color { Red, Green }` | `type Color = Red \| Green` | Sum type |
| `T extends U ? A : B` | Overloads or sum types | Conditional types not supported |
| `{ [K in keyof T]: ... }` | `Partial<T>`, `Pick<T, K>` | Mapped types not supported |
| `x!` (non-null assertion) | `if (x !== null) { ... }` | Explicit null check |
| `x as T` | `x as unknown as T` | Unsafe cast — two-step required |
| `infer R` | — | Not available; use overloads |
| `` `prefix${T}` `` (type) | Literal union | Template literal types not supported |
| TypeScript `private` | `#private` (preferred) or keep `private` with SJS-W006 | |
| `implements` on classes | Optional (structural typing) | `implements` accepted but not required |
| Declaration merging | Not supported | Use module augmentation carefully |
| `namespace` | ES module | Use ES modules |
| `triple-slash` directives | Not supported | Use ES imports |

### D.2 Automatic Migration Tool (Planned)

A `superjs migrate --from typescript` command is planned for Phase 2 that will:

1. Rename `any` → `dynamic` throughout.
2. Convert `enum` to sum types with a best-effort transformation.
3. Remove banned constructs with a descriptive comment explaining the manual change needed.
4. Report all positions that require manual attention.

---

## Appendix E — Version History

| Edition | Date | Description |
|---------|------|-------------|
| 1.0 Draft | 2026-05-30 | Initial formal language specification. Covers Phase 1 (Babel prototype) and documents Phase 2/3 plans. |

---

*End of Super.js Language Specification, Edition 1.0*

*Super.js is copyright 2026 Himank Barve and contributors. This specification is made available under the MIT License.*
