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

Iterates over an `AsyncIterable<T>`. The loop variable has type `T`. The right-hand side must implement the `AsyncIterable<T>` interface (i.e., have a `[Symbol.asyncIterator]()` method returning `AsyncIterator<T>`). Each iteration implicitly awaits the next value.

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
