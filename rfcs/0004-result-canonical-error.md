# RFC-0004: `Result<T, E>` as the Canonical Error Type
- **Status:** Accepted
- **Date:** 2026-05-31
- **Author:** SuperJS Maintainers

## Summary

`Result<T, E>` is the canonical error-handling type in SJS. It is a built-in sum type exported by the standard library. Exception-based error handling is de-emphasized: `try/catch` remains available for JS interop but the linter actively discourages its use in new SJS code.

## Motivation

Exceptions are invisible in type signatures. A function can throw anything — a string, an `Error`, a custom object — without declaring it. This makes it impossible to know what errors to handle at a call site without reading the implementation or documentation. Callers routinely forget to handle errors, and the mistake is not caught until runtime.

`Result<T, E>` makes the error path a first-class part of the function's type. A function that returns `Result<number, ParseError>` is advertising precisely what can go wrong. The caller cannot ignore the error without an explicit decision (e.g., `unwrap()`). This aligns SJS with the principle that the type system should make illegal states unrepresentable.

## Proposal

### Built-in type

The SJS standard library exports `Result<T, E>` as a compiler-intrinsic type:

```sjs
// stdlib — not user-definable in user code, but usable everywhere
type Result<T, E> = Ok(T) | Err(E);
```

`Ok` and `Err` are available as global constructors without an import statement. Importing from `"sjs:result"` is optional and provides utility functions.

### Idiomatic usage

```sjs
fn divide(a: number, b: number): Result<number, string> {
  if (b === 0) {
    return Err("division by zero");
  }
  return Ok(a / b);
}

let result = divide(10, 2);

match result {
  Ok(value) => console.log("result:", value),
  Err(msg)  => console.error("error:", msg),
}
```

### Chaining with `?` operator

A postfix `?` operator propagates `Err` early from the current function (analogous to Rust's `?`):

```sjs
fn parseAndDouble(s: string): Result<number, string> {
  let n = parseInt(s)?;   // returns Err early if parseInt returns Err
  return Ok(n * 2);
}
```

The `?` operator is only valid inside a function whose return type is `Result<_, E>` where `E` is compatible with the propagated error type. Using `?` outside such a function is `SJS-E030`.

### JS interop: `try/catch`

`try/catch` remains available for calling JS libraries that throw:

```sjs
fn readFileSafe(path: string): Result<string, Error> {
  try {
    return Ok(fs.readFileSync(path, "utf8"));
  } catch (e) {
    return Err(e as Error);
  }
}
```

The linter rule `prefer-result-over-throw` (Stage 3) warns when a `try/catch` block could be replaced with a `Result`-returning function. It is opt-in at v1.0.

### `no-unhandled-result` lint rule

The linter provides `no-unhandled-result` (Stage 3): a `Result` value that is assigned to a variable prefixed with `_` or discarded entirely triggers a warning. This rule is enabled by default in the recommended config.

```sjs
divide(10, 0); // warning: Result value discarded (SJS-L010)
let _ = divide(10, 0); // OK: explicit discard
```

### Standard library utilities

`"sjs:result"` exports:

- `map<T, U, E>(r: Result<T, E>, f: (T) => U): Result<U, E>`
- `flatMap<T, U, E>(r: Result<T, E>, f: (T) => Result<U, E>): Result<U, E>`
- `unwrap<T, E>(r: Result<T, E>): T` — throws if `Err`; use only in tests or scripts
- `unwrapOr<T, E>(r: Result<T, E>, default: T): T`
- `fromThrowable<T>(f: () => T): Result<T, Error>` — wraps a throwing function

## Alternatives Considered

**Use `Either<L, R>` (Haskell style)** — rejected. `Either` puts the error on the left and the success on the right by convention, which is unintuitive to JS developers. `Result/Ok/Err` is widely understood from Rust and Swift and maps directly to how JS developers already think about success vs. failure.

**Use throwing + `Error` subclasses** — rejected. This is the status quo in JavaScript and does not help. Typed `Error` subclasses improve runtime information but still produce invisible type signatures.

**Make `Result` a class with `.map()` methods** — rejected. Methods on a `Result` class cannot be exhaustively checked by `match`. A plain sum type keeps the representation orthogonal from utility operations.

## Drawbacks

Wrapping every operation that can fail in `Result` is more verbose than `try/catch`. A single-line `JSON.parse(s)` becomes a `fromThrowable` call plus a `match`. This is the deliberate trade-off: explicitness over brevity for error paths.

Interop with promise-based APIs requires adapter functions. A `Result`-based async story (e.g., `AsyncResult<T, E>`) is not part of this RFC and is deferred to a future proposal. For now, async functions return `Promise<Result<T, E>>` and callers `await` then `match`.

## Unresolved Questions

- Should `unwrap()` be removed from the standard library to prevent lazy error handling? Tentatively kept but named to signal danger (`unsafeUnwrap` was considered; rejected as too verbose for test code).
- Should the `?` operator work inside `async` functions returning `Promise<Result<T, E>>`? Tentatively yes, with an `await` implicit in the desugaring.
