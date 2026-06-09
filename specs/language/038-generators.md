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
