# SJS → ECMA-262 Section Map

Reference: ECMAScript 2022 (13th Edition)
Base URL: https://262.ecma-international.org/13.0/

---

## 1. Variable Declarations

- `let` / `const`: §14.3.1 — https://262.ecma-international.org/13.0/#sec-let-and-const-declarations
- `var`: §14.3.2 — https://262.ecma-international.org/13.0/#sec-variable-statement
- Destructuring assignment (object / array patterns): §14.3.3 — https://262.ecma-international.org/13.0/#sec-destructuring-binding-patterns
- Destructuring assignment (left-hand side): §13.15.5 — https://262.ecma-international.org/13.0/#sec-runtime-semantics-destructuringassignmentevaluation

---

## 2. Functions

- Function declaration: §15.2 — https://262.ecma-international.org/13.0/#sec-function-definitions
- Arrow function: §15.3 — https://262.ecma-international.org/13.0/#sec-arrow-function-definitions
- Generator function: §15.5 — https://262.ecma-international.org/13.0/#sec-generator-function-definitions
- Async function: §15.8 — https://262.ecma-international.org/13.0/#sec-async-function-definitions
- Async generator function: §15.6 — https://262.ecma-international.org/13.0/#sec-async-generator-function-definitions
- Formal parameters (defaults, rest): §15.1 — https://262.ecma-international.org/13.0/#sec-parameter-lists
- Function calls (call expression): §13.3.8 — https://262.ecma-international.org/13.0/#sec-function-calls
- `return` statement: §14.10 — https://262.ecma-international.org/13.0/#sec-return-statement

---

## 3. Classes

- Class declaration and expression: §15.7 — https://262.ecma-international.org/13.0/#sec-class-definitions
- Class element semantics (static, methods, fields): §15.7.1 — https://262.ecma-international.org/13.0/#sec-runtime-semantics-classelementevaluation
- Private class fields (`#name`): §15.7.1 — https://262.ecma-international.org/13.0/#sec-ecmascript-language-private-fields
- Private methods: §15.7.1 — https://262.ecma-international.org/13.0/#sec-private-methods
- Static class fields and methods: §15.7.1 — https://262.ecma-international.org/13.0/#sec-static-class-features
- `super` keyword: §13.3.7 — https://262.ecma-international.org/13.0/#sec-super-keyword
- `new` expression: §13.3.5 — https://262.ecma-international.org/13.0/#sec-new-operator

---

## 4. Expressions

- Assignment expression (`=`, `+=`, etc.): §13.15 — https://262.ecma-international.org/13.0/#sec-assignment-operators
- Logical assignment (`&&=`, `||=`, `??=`): §13.15 — https://262.ecma-international.org/13.0/#sec-assignment-operators
- Optional chaining (`?.`): §13.5.7 — https://262.ecma-international.org/13.0/#sec-optional-chaining
- Nullish coalescing (`??`): §13.13 — https://262.ecma-international.org/13.0/#sec-binary-logical-operators
- Logical OR / AND (`||`, `&&`): §13.13 — https://262.ecma-international.org/13.0/#sec-binary-logical-operators
- Exponentiation (`**`): §13.6 — https://262.ecma-international.org/13.0/#sec-exp-operator
- Spread element in array / call: §13.2.4 — https://262.ecma-international.org/13.0/#sec-array-initializer
- Spread in function call: §13.3.8.1 — https://262.ecma-international.org/13.0/#sec-runtime-semantics-argumentlistevaluation
- Comma operator: §13.16 — https://262.ecma-international.org/13.0/#sec-comma-operator
- `typeof` operator: §13.5.3 — https://262.ecma-international.org/13.0/#sec-typeof-operator
- `instanceof` operator: §13.10.2 — https://262.ecma-international.org/13.0/#sec-relational-operators
- `in` operator: §13.10.1 — https://262.ecma-international.org/13.0/#sec-relational-operators
- `delete` operator: §13.5.1 — https://262.ecma-international.org/13.0/#sec-delete-operator
- `void` operator: §13.5.2 — https://262.ecma-international.org/13.0/#sec-void-operator
- `await` expression: §13.3.12 — https://262.ecma-international.org/13.0/#sec-await
- `yield` expression: §15.5.3 — https://262.ecma-international.org/13.0/#sec-generator-function-definitions-runtime-semantics-evaluation

---

## 5. Template Literals

- Template literal (tagged and untagged): §13.2.8 — https://262.ecma-international.org/13.0/#sec-template-literals
- Tagged templates: §13.3.11 — https://262.ecma-international.org/13.0/#sec-tagged-templates
- Template literal types (lexical): §12.8.6 — https://262.ecma-international.org/13.0/#sec-template-literal-lexical-components

---

## 6. Modules

- Top-level await: §16.2.1.1 — https://262.ecma-international.org/13.0/#sec-moduleevaluation
- Module record / evaluation: §16.2.1 — https://262.ecma-international.org/13.0/#sec-abstract-module-records
- `import` declaration (static): §16.2.2 — https://262.ecma-international.org/13.0/#sec-imports
- `export` declaration: §16.2.3 — https://262.ecma-international.org/13.0/#sec-exports
- Dynamic `import()` expression: §13.3.10 — https://262.ecma-international.org/13.0/#sec-import-calls
- Namespace object (`import * as ns`): §16.2.2.4 — https://262.ecma-international.org/13.0/#sec-module-namespace-objects
- `import.meta`: §13.3.12 — https://262.ecma-international.org/13.0/#sec-meta-properties

---

## 7. ECMAScript Language Types

- Undefined type: §6.1.1 — https://262.ecma-international.org/13.0/#sec-ecmascript-language-types-undefined-type
- Null type: §6.1.2 — https://262.ecma-international.org/13.0/#sec-ecmascript-language-types-null-type
- Boolean type: §6.1.3 — https://262.ecma-international.org/13.0/#sec-ecmascript-language-types-boolean-type
- String type: §6.1.4 — https://262.ecma-international.org/13.0/#sec-ecmascript-language-types-string-type
- Symbol type: §6.1.5 — https://262.ecma-international.org/13.0/#sec-ecmascript-language-types-symbol-type
- Number type: §6.1.6.1 — https://262.ecma-international.org/13.0/#sec-ecmascript-language-types-number-type
- BigInt type: §6.1.6.2 — https://262.ecma-international.org/13.0/#sec-ecmascript-language-types-bigint-type
- Object type: §6.1.7 — https://262.ecma-international.org/13.0/#sec-object-type
- Type coercion (`ToNumber`, `ToString`, `ToBoolean`): §7.1 — https://262.ecma-international.org/13.0/#sec-type-conversion
- Abstract equality (`==`): §7.2.14 — https://262.ecma-international.org/13.0/#sec-islooselyequal
- Strict equality (`===`): §7.2.15 — https://262.ecma-international.org/13.0/#sec-isstrictlyequal

---

## 8. Built-in Objects

- `Array`: §23.1 — https://262.ecma-international.org/13.0/#sec-array-objects
- `Array.prototype` methods: §23.1.3 — https://262.ecma-international.org/13.0/#sec-properties-of-the-array-prototype-object
- `Map`: §24.1 — https://262.ecma-international.org/13.0/#sec-map-objects
- `Set`: §24.2 — https://262.ecma-international.org/13.0/#sec-set-objects
- `WeakMap`: §24.3 — https://262.ecma-international.org/13.0/#sec-weakmap-objects
- `WeakSet`: §24.4 — https://262.ecma-international.org/13.0/#sec-weakset-objects
- `WeakRef`: §26.1 — https://262.ecma-international.org/13.0/#sec-weak-ref-objects
- `FinalizationRegistry`: §26.2 — https://262.ecma-international.org/13.0/#sec-finalization-registry-objects
- `Promise`: §27.2 — https://262.ecma-international.org/13.0/#sec-promise-objects
- `Symbol`: §20.4 — https://262.ecma-international.org/13.0/#sec-symbol-objects
- `Proxy` / `Reflect`: §28.1 — https://262.ecma-international.org/13.0/#sec-proxy-objects
- `RegExp`: §22.2 — https://262.ecma-international.org/13.0/#sec-regexp-regular-expression-objects
- `Error` (and subtypes): §20.5 — https://262.ecma-international.org/13.0/#sec-error-objects
- `Object`: §20.1 — https://262.ecma-international.org/13.0/#sec-object-objects
- `Function`: §20.2 — https://262.ecma-international.org/13.0/#sec-function-objects
- `Number`: §21.1 — https://262.ecma-international.org/13.0/#sec-number-objects
- `BigInt`: §21.2 — https://262.ecma-international.org/13.0/#sec-bigint-objects
- `String` (wrapper): §22.1 — https://262.ecma-international.org/13.0/#sec-string-objects
- `Boolean` (wrapper): §20.3 — https://262.ecma-international.org/13.0/#sec-boolean-objects
- `Date`: §21.4 — https://262.ecma-international.org/13.0/#sec-date-objects
- `Math`: §21.3 — https://262.ecma-international.org/13.0/#sec-math-object
- `JSON`: §25.5 — https://262.ecma-international.org/13.0/#sec-json-object
- `globalThis`: §19.1 — https://262.ecma-international.org/13.0/#sec-globalthis
- `Atomics`: §25.4 — https://262.ecma-international.org/13.0/#sec-atomics-object
- `SharedArrayBuffer`: §25.2 — https://262.ecma-international.org/13.0/#sec-sharedarraybuffer-objects

---

## 9. Control Flow

- `if` / `else`: §14.6 — https://262.ecma-international.org/13.0/#sec-if-statement
- `for` statement: §14.7.4 — https://262.ecma-international.org/13.0/#sec-for-statement
- `for-in` statement: §14.7.5 — https://262.ecma-international.org/13.0/#sec-for-in-and-for-of-statements
- `for-of` statement: §14.7.5.6 — https://262.ecma-international.org/13.0/#sec-for-in-and-for-of-statements
- `for-await-of` statement: §14.7.5.4 — https://262.ecma-international.org/13.0/#sec-for-in-and-for-of-statements
- `while` statement: §14.7.2 — https://262.ecma-international.org/13.0/#sec-while-statement
- `do-while` statement: §14.7.3 — https://262.ecma-international.org/13.0/#sec-do-while-statement
- `switch` statement: §14.12 — https://262.ecma-international.org/13.0/#sec-switch-statement
- `try` / `catch` / `finally`: §14.15 — https://262.ecma-international.org/13.0/#sec-try-statement
- `throw` statement: §14.14 — https://262.ecma-international.org/13.0/#sec-throw-statement
- `break` statement: §14.9 — https://262.ecma-international.org/13.0/#sec-break-statement
- `continue` statement: §14.8 — https://262.ecma-international.org/13.0/#sec-continue-statement
- `with` statement (discouraged): §14.11 — https://262.ecma-international.org/13.0/#sec-with-statement
- `label` statement: §14.13 — https://262.ecma-international.org/13.0/#sec-labelled-statements
- `debugger` statement: §14.16 — https://262.ecma-international.org/13.0/#sec-debugger-statement

---

## 10. SJS Diagnostic Codes → ECMA-262 Sections

### Errors

| Code | Description | ECMA-262 Section | URL |
|------|-------------|------------------|-----|
| SJS-E001 | Type mismatch — assignment of incompatible type | §14.3.1 (let/const declarations) | https://262.ecma-international.org/13.0/#sec-let-and-const-declarations |
| SJS-E002 | Return type mismatch — function body return type differs from declared return | §15.2 (function definitions) | https://262.ecma-international.org/13.0/#sec-function-definitions |
| SJS-E003 | Call argument count or type mismatch | §13.3.8 (function calls) | https://262.ecma-international.org/13.0/#sec-function-calls |
| SJS-E004 | Circular import — module graph contains a cycle | §16.2 (modules) | https://262.ecma-international.org/13.0/#sec-modules |

### Warnings

| Code | Description | ECMA-262 / Reference | URL |
|------|-------------|----------------------|-----|
| SJS-W001 | Implicit `any` — value has no type annotation and type cannot be inferred | TypeScript `noImplicitAny` (not in ECMA-262; SJS extension) | https://www.typescriptlang.org/tsconfig#noImplicitAny |
| SJS-W002 | Unused variable declared but never read | §14.3 (variable declarations) | https://262.ecma-international.org/13.0/#sec-declarations-and-the-variable-statement |
| SJS-W003 | Unused import — imported binding is never referenced | §16.2.2 (imports) | https://262.ecma-international.org/13.0/#sec-imports |

### Lint Rules

| Code | Description | ECMA-262 Section | URL |
|------|-------------|------------------|-----|
| SJS-L001 | Prefer `const` — variable is never reassigned after initialization | §14.3.1 (let-and-const-declarations) | https://262.ecma-international.org/13.0/#sec-let-and-const-declarations |

---

## Appendix: Key Algorithmic Cross-References

| SJS Operation | Abstract Operation | ECMA-262 §  | URL |
|---------------|--------------------|-------------|-----|
| Property access | `GetValue` | §6.2.4.8 | https://262.ecma-international.org/13.0/#sec-getvalue |
| Property write | `PutValue` | §6.2.4.9 | https://262.ecma-international.org/13.0/#sec-putvalue |
| Object property lookup | `[[GetPrototypeOf]]` | §10.1.1 | https://262.ecma-international.org/13.0/#sec-ordinary-object-internal-methods-and-internal-slots-getprototypeof |
| `typeof` result | `typeof` operator semantics | §13.5.3 | https://262.ecma-international.org/13.0/#sec-typeof-operator |
| Iteration protocol | Iterator interface | §27.1 | https://262.ecma-international.org/13.0/#sec-iteration |
| Async iteration protocol | Async iterator interface | §27.1 | https://262.ecma-international.org/13.0/#sec-asynciterator-interface |
| Module linking | `Link` / `Evaluate` | §16.2.1 | https://262.ecma-international.org/13.0/#sec-abstract-module-records |
| Promise resolution | `PromiseResolve` | §27.2.4.7 | https://262.ecma-international.org/13.0/#sec-promise-resolve |
| Tail call optimization | PrepareForTailCall | §13.3.8.1 | https://262.ecma-international.org/13.0/#sec-runtime-semantics-argumentlistevaluation |
