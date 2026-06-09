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
