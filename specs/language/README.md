# specs/language/ — Per-Feature Language Specification

Assembly point for the canonical SuperJS language specification.
Each file covers one language feature and is authoritative for the compiler,
LSP, formatter, and LLVM backend. Stage 6 assembles these into the published
`SPEC.md`.

## Structure

Each feature file follows `NNN-feature-name.md` and contains:

- **Syntax** — EBNF excerpt from `specs/grammar.ebnf`
- **Semantics** — normative prose
- **Type rules** — inference and checking rules
- **JS Lowering** — how the prototype (Babel-based) compiler transforms this construct
- **LLVM Lowering** — how this construct maps to LLVM IR (future backend)
- **Diagnostic codes** — which `SJS-EXXX` codes this feature can emit
- **Examples** — valid and invalid SJS with expected diagnostics

## File index

### Foundations

| File | Feature | Status |
|------|---------|--------|
| `000-keywords.md` | All SJS keywords: inherited JS, SJS-new, TS-borrowed, banned, reserved, contextual | Stage 0 — complete |

### Group 1 — SJS Core Extensions

| File | Feature | Status |
|------|---------|--------|
| `001-null-safety.md` | Nullable types (`T?`), null narrowing, flow analysis | Stage 0 — prototype implemented |
| `002-sum-types.md` | Sum type declarations and variant constructors | Stage 0 — prototype implemented |
| `003-match.md` | Match expressions and exhaustiveness checking | Stage 0 — prototype implemented |
| `004-dynamic.md` | `dynamic` escape hatch and propagation rules | Stage 1 — planned |
| `005-generics.md` | Generic functions, interfaces, and classes | Stage 1 — planned |
| `006-interfaces.md` | `interface`, structural conformance (Go-style) | Stage 1 — planned |
| `007-banned-features.md` | Banned TS constructs and SJS replacements | Stage 1 — planned |
| `008-access-modifiers.md` | `public`/`private`/`protected` on class members | Stage 1 — planned |

### Group 2 — Type System

| File | Feature | Status |
|------|---------|--------|
| `010-primitives.md` | `number`, `string`, `boolean`, `symbol`, `bigint`, `null`, `undefined`, `void`, `never`, `unknown` | Stage 1 — planned |
| `011-union-types.md` | `A \| B`, narrowing, discriminated unions | Stage 1 — planned |
| `012-array-types.md` | `T[]`, `ReadonlyArray<T>`, tuple `[A, B]` | Stage 1 — planned |
| `013-function-types.md` | `(a: T) => R`, overloads, `this` parameter | Stage 1 — planned |
| `014-object-types.md` | `{ k: T }`, index signatures, excess property checking | Stage 1 — planned |
| `015-type-inference.md` | `let`/`const` inference, return type inference, contextual typing | Stage 1 — planned |
| `016-type-narrowing.md` | `typeof`/`instanceof`/`in`/truthiness/assignment narrowing, `as` cast | Stage 1 — planned |

### Group 3 — Declarations

| File | Feature | Status |
|------|---------|--------|
| `020-variables.md` | `var`/`let`/`const`, scoping, TDZ, `SJS-L001` prefer-const | Stage 1 — planned |
| `021-functions.md` | Declaration/expression/arrow, `async`, generators, overloads | Stage 1 — planned |
| `022-classes.md` | `class`, `extends`, `super`, private fields `#f`, static blocks, `abstract` | Stage 1 — planned |
| `023-modules.md` | `import`/`export`, re-export, namespace, dynamic `import()`, `import.meta` | Stage 1 — planned |

### Group 4 — Expressions & Operators

| File | Feature | Status |
|------|---------|--------|
| `030-operators.md` | Arithmetic/bitwise/comparison — type rules per operator | Stage 1 — planned |
| `031-optional-chaining.md` | `?.` member/call/index, type narrowing | Stage 1 — planned |
| `032-nullish-coalesce.md` | `??`, `??=`, interaction with `T?` | Stage 1 — planned |
| `033-logical-assignment.md` | `&&=`, `\|\|=`, `??=` | Stage 1 — planned |
| `034-destructuring.md` | Array/object patterns, typed bindings, defaults, rest | Stage 1 — planned |
| `035-spread-rest.md` | `...` in calls/arrays/objects, typed spread | Stage 1 — planned |
| `036-template-literals.md` | Interpolation, tagged templates, typed tag functions | Stage 1 — planned |
| `037-async-await.md` | `async fn`, `await`, top-level await, `Promise<T>` | Stage 1 — planned |
| `038-generators.md` | `function*`, `yield`, `yield*`, `Generator<Y,R,N>` | Stage 1 — planned |
| `039-jsx.md` | JSX elements, fragments, SJS type rules for JSX | Stage 1 — planned |

### Group 5 — Statements & Control Flow

| File | Feature | Status |
|------|---------|--------|
| `040-control-flow.md` | `if`/`else`, `switch`, `for`, `while`, `do-while`, labels | Stage 1 — planned |
| `041-try-catch.md` | `try`/`catch`/`finally`, typed catch, `error.cause` | Stage 1 — planned |
| `042-for-of-for-in.md` | `for...of` (iterable protocol), `for await...of`, `for...in` | Stage 1 — planned |

### Group 6 — Codegen

| File | Feature | Status |
|------|---------|--------|
| `050-js-lowering.md` | How each SJS construct maps to output JS (prototype target) | Stage 1 — planned |
| `051-llvm-lowering.md` | How each SJS construct maps to LLVM IR (future target) | Stage 2+ — planned |
| `052-sum-type-encoding.md` | `{_tag, _0}` runtime shape, variant constructor lowering | Stage 1 — planned |
| `053-match-lowering.md` | `match` → if-chain/switch compilation | Stage 1 — planned |
| `054-source-maps.md` | Source map fidelity requirements, `.sjs`→`.js` mapping | Stage 1 — planned |

### Group 8 — Platform & integration

| File | Feature | Status |
|------|---------|--------|
| `lexical.md` | Token grammar prose | v1.0 — assembled |
| `syntax.md` | Concrete syntax index | v1.0 — assembled |
| `cli-surface.md` | CLI commands and exit codes | v1.0 — complete |
| `incremental-model.md` | Cache keys, `apiHash`, LSP session | v1.0 — complete |
| `interop.md` | TS interop, `dynamic`, wrappers | v1.0 — complete |
| `stdlib-surface.md` | v1.0 `@superjs/std-*` stable surface | v1.0 — complete |
| `build-tool-integration.md` | Vite/esbuild/Jest/Vitest plugins | v1.0 — complete |

### Group 7 — Diagnostics

| File | Feature | Status |
|------|---------|--------|
| `060-error-codes-map.md` | Feature → `SJS-E/W/L` code cross-reference | Stage 1 — planned |

---

## Adding a new feature file

1. Pick the next available number in the correct group.
2. Copy `_template.md`.
3. Fill in: Syntax, Semantics, Type rules, JS Lowering, LLVM Lowering, Diagnostics, Examples.
4. Add a row to the index table above.
5. PR must touch this README alongside the new spec file.
