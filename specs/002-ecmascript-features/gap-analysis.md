# ECMAScript Features — Gap Analysis

Baseline type checker (prototype/src/typeChecker/index.ts) handles:

| Feature | Status | Notes |
|---------|--------|-------|
| Primitive literals (string/number/boolean/null/bigint/symbol) | ✅ Done | inferExprType handles all literal node kinds |
| Variable declarations (const/let/var) | ✅ Done | TC-001/TC-004 |
| Re-assignment | ✅ Done | TC-004 |
| Function declarations (return type / params) | ✅ Done | TC-005/TC-006 |
| Arrow functions (concise + block body) | ✅ Done | TC-005 |
| Call expression argument checking | ✅ Done | TC-006 |
| Sum type alias registration | ✅ Done | TC-007 |
| Switch exhaustiveness | ✅ Done | SJS-E007 |
| Union types | ✅ Done | isConsistent union right/left |
| Implicit any (strict mode) | ✅ Done | SJS-W001 |

## Gaps

### Gap 1 — Binary expression type checking (SJS-E004)

**ECMA-262 §13.15.4** Numeric operands mix rule:
- `number + number` → `number`
- `bigint + bigint` → `bigint`
- `bigint + number` → **TypeError at runtime** → SJS-E004

Current: `BinaryExpression` falls through to `T_ANY` in `inferExprType`. The BigInt/Number mix
is a well-known ECMAScript pitfall (TC39 explicitly prohibits mixed arithmetic for BigInt — §6.1.6.2).

**Priority: High** — affects correctness, spec-mandated prohibition.

### Gap 2 — Logical / conditional expression type inference

**ECMA-262 §13.13, §13.14**:
- `a && b` → type of `b` (if both typed) or union
- `a || b` → union of types
- `a ?? b` (nullish coalescing §13.13) → if `a` is `T | null | undefined`, result is `T | typeof(b)`
- `cond ? a : b` → union of types of `a` and `b`

Current: all fall through to `T_ANY`.

### Gap 3 — Array literal and index type inference

**ECMA-262 §13.2.4**:
- `[1, 2, 3]` → `number[]`
- `arr[i]` where `arr: number[]` → `number`

Current: array literals fall through to `T_ANY`; computed member expressions not handled.

### Gap 4 — Object literal type inference

**ECMA-262 §13.2.5**:
- `{ x: 1, y: "hello" }` → `{ x: number; y: string }`

Current: `ObjectExpression` not handled, returns `T_ANY`.

### Gap 5 — Unary expression type inference

**ECMA-262 §13.5**:
- `typeof x` → `string`
- `!x` → `boolean`
- `-x` where `x: number` → `number`
- `-x` where `x: bigint` → `bigint`

### Gap 6 — Property access type inference

**ECMA-262 §13.3.2**:
- `obj.prop` where `obj: ObjectType` with known property → type of property
- `arr.length` where `arr: ArrayType` → `number`

### Gap 7 — Async function return type

**ECMA-262 §27.2** (Promise):
- Async functions implicitly wrap return type in `Promise<T>`
- Not yet modelled in `FunctionType`

### Gap 8 — Destructuring patterns

**ECMA-262 §14.3.3**:
- `const [a, b] = pair` — array destructuring
- `const { x, y } = point` — object destructuring

Current: `!t.isIdentifier(decl.id)` in `checkVariableDeclaration` skips non-identifier patterns entirely.
