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
