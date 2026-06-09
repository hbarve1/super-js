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
