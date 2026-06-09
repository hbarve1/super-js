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
