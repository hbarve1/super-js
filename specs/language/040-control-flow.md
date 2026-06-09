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
