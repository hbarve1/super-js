# ECMAScript Features — Implementation Plan

Each task is self-contained and adds one type-checking rule on top of the existing
bidirectional type checker (prototype/src/typeChecker/index.ts).

Babel handles all compilation; we only add SJS type-checking on top.

---

## Phase 1 — Arithmetic and Operator Type Checking

### Task 1.1 — Binary expression type inference + BigInt/Number mix (SJS-E004)

**Gap:** Binary expressions (`BinaryExpression`) fall through to `T_ANY` in `inferExprType`.
The ECMAScript spec §6.1.6.2 explicitly prohibits mixing BigInt and Number in arithmetic.

**Spec refs:**
- ECMA-262 §13.15.4 Applying the Addition Operation — https://tc39.es/ecma262/#sec-addition-operation
- ECMA-262 §6.1.6.2 The BigInt Type — https://tc39.es/ecma262/#sec-ecmascript-language-types-bigint-type
- ECMA-262 §13.15 Binary Expressions — https://tc39.es/ecma262/#sec-binary-arithmetic-operators

**What to implement:**
1. In `inferExprType`, handle `BinaryExpression`:
   - Infer left and right operand types.
   - For arithmetic operators (`+`, `-`, `*`, `/`, `%`, `**`):
     - left=`number`, right=`number` → `number`
     - left=`bigint`, right=`bigint` → `bigint`
     - left=`bigint`, right=`number` (or vice versa) → emit SJS-E004, return `T_ANY`
     - left or right is `string` and operator is `+` → `string` (string concatenation)
   - For relational/equality operators (`<`, `>`, `<=`, `>=`, `===`, `!==`, `==`, `!=`) → `boolean`
   - For bitwise operators (`&`, `|`, `^`, `<<`, `>>`, `>>>`) → `number` (or `bigint` if both sides are bigint)
2. Add `SJS-E004` to SPEC constants.
3. Tests in `prototype/tests/typeChecker/type-checker.test.ts`.
4. Example: `specs/002-ecmascript-features/examples/binary-expressions.sjs`.

**Error code:** SJS-E004
**Files:** `prototype/src/typeChecker/index.ts`, `prototype/tests/typeChecker/type-checker.test.ts`

- [x] Implement BinaryExpression inference in `inferExprType`
- [x] Emit SJS-E004 on BigInt+Number mixing
- [x] Add tests
- [x] Add example .sjs file
- [x] Commit and push

---

### Task 1.2 — Logical and conditional expression type inference

**Gap:** `LogicalExpression` (`&&`, `||`, `??`) and `ConditionalExpression` (ternary) return `T_ANY`.

**Spec refs:**
- ECMA-262 §13.13 Binary Logical Operators — https://tc39.es/ecma262/#sec-binary-logical-operators
- ECMA-262 §13.14 Conditional Operator — https://tc39.es/ecma262/#sec-conditional-operator

**What to implement:**
1. `LogicalExpression` in `inferExprType`:
   - `&&` → if left is truthy-typed, return right type; otherwise union of left and right
   - `||` → union of left and right types (consistent with TypeScript)
   - `??` → if left is `T | null | undefined`, return `T | typeof(right)`; else left type
2. `ConditionalExpression` in `inferExprType`:
   - Return union of consequent and alternate types

- [x] Implement LogicalExpression type inference
- [x] Implement ConditionalExpression type inference
- [x] Add tests
- [x] Add example .sjs file
- [x] Commit and push

---

## Phase 2 — Collection Type Inference

### Task 2.1 — Array literal type inference

**Gap:** `ArrayExpression` falls through to `T_ANY`; computed member access not handled.

**Spec refs:**
- ECMA-262 §13.2.4 Array Initializer — https://tc39.es/ecma262/#sec-array-initializer

**What to implement:**
1. `ArrayExpression` in `inferExprType`:
   - If all elements share the same type `T`, return `Array<T>` (i.e., `{ kind: 'array', elementType: T }`)
   - Otherwise return `Array<any>`
2. `MemberExpression` (computed, e.g., `arr[0]`):
   - If object type is `ArrayType`, return its `elementType`

- [x] Implement ArrayExpression inference
- [x] Implement computed MemberExpression inference
- [x] Add tests
- [x] Add example .sjs file
- [x] Commit and push

---

### Task 2.2 — Object literal type inference + property access

**Gap:** `ObjectExpression` and `MemberExpression` (static) return `T_ANY`.

**Spec refs:**
- ECMA-262 §13.2.5 Object Initializer — https://tc39.es/ecma262/#sec-object-initializer
- ECMA-262 §13.3.2 Property Accessors — https://tc39.es/ecma262/#sec-property-accessors

**What to implement:**
1. `ObjectExpression` in `inferExprType`:
   - Build `ObjectType` with `properties` map from each key→inferred value type
2. Static `MemberExpression` (`obj.prop`) in `inferExprType`:
   - If object type is `ObjectType` and property key exists, return its type
   - If object type is `ArrayType` and property is `length`, return `number`

- [x] Implement ObjectExpression inference
- [x] Implement static MemberExpression inference
- [x] Add tests
- [x] Add example .sjs file
- [x] Commit and push

---

## Phase 3 — Unary and Nullish Operators

### Task 3.1 — Unary expression type inference

**Gap:** `UnaryExpression` returns `T_ANY`.

**Spec refs:**
- ECMA-262 §13.5 Unary Operators — https://tc39.es/ecma262/#sec-unary-operators

**What to implement:**
1. `UnaryExpression` in `inferExprType`:
   - `typeof expr` → `string`
   - `!expr` → `boolean`
   - `-expr` / `+expr` where expr is `number` → `number`
   - `-expr` / `+expr` where expr is `bigint` → `bigint`
   - `~expr` where expr is `number` → `number`
   - `void expr` → `undefined`

- [ ] Implement UnaryExpression inference
- [ ] Add tests
- [ ] Add example .sjs file
- [ ] Commit and push

---

### Task 3.2 — Optional chaining and nullish coalescing narrowing

**Gap:** `OptionalMemberExpression`, `OptionalCallExpression` return `T_ANY`.

**Spec refs:**
- ECMA-262 §13.5.1 Optional Chains — https://tc39.es/ecma262/#sec-optional-chains

**What to implement:**
1. `OptionalMemberExpression` in `inferExprType`:
   - If object is non-nullable `ObjectType` with known property, return `T | undefined`
2. Improve `??` inference in `LogicalExpression` (from Task 1.2) to narrow union types:
   - `(T | null | undefined) ?? U` → `T | U`

- [ ] Implement OptionalMemberExpression inference
- [ ] Refine nullish coalescing narrowing
- [ ] Add tests
- [ ] Add example .sjs file
- [ ] Commit and push

---

## Phase 4 — Destructuring Patterns

### Task 4.1 — Array destructuring type inference

**Gap:** `checkVariableDeclaration` skips non-`Identifier` patterns (`!t.isIdentifier(decl.id)`).

**Spec refs:**
- ECMA-262 §14.3.3 Destructuring Binding Patterns — https://tc39.es/ecma262/#sec-destructuring-binding-patterns

**What to implement:**
1. In `checkVariableDeclaration`, handle `ArrayPattern`:
   - If initializer type is `ArrayType`, bind each element identifier to `elementType`
   - Otherwise bind to `any`
2. Report SJS-E002 if initializer type is not an array when pattern is `ArrayPattern`

- [ ] Handle ArrayPattern in checkVariableDeclaration
- [ ] Add tests
- [ ] Add example .sjs file
- [ ] Commit and push

---

### Task 4.2 — Object destructuring type inference

**Gap:** `ObjectPattern` in variable declarations is skipped.

**Spec refs:**
- ECMA-262 §14.3.3 Destructuring Binding Patterns — https://tc39.es/ecma262/#sec-destructuring-binding-patterns

**What to implement:**
1. In `checkVariableDeclaration`, handle `ObjectPattern`:
   - If initializer type is `ObjectType`, bind each property key to its declared type
   - Otherwise bind all extracted names to `any`
2. Report SJS-E002 if initializer is not an `ObjectType` and has a declared annotation

- [ ] Handle ObjectPattern in checkVariableDeclaration
- [ ] Add tests
- [ ] Add example .sjs file
- [ ] Commit and push
