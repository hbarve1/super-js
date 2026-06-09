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
