# SuperJS (SJS) — Prototype Design

**Date**: 2026-05-30  
**Status**: Approved  
**Sprint Goal**: Demo-ready prototype in one weekend

---

## 1. What We Are Building

SuperJS (SJS) is a new programming language — not TypeScript with a different extension. It:

- Compiles `.sjs` → JavaScript (Babel prototype) → eventually native (LLVM)
- Is a strict superset of JavaScript: every valid JS program is a valid SJS program
- Adds gradual static typing with Go-inspired simplicity (not TypeScript complexity)
- Has JSX support on by default, no configuration required
- Ships a unified CLI: `superjs build | lint | format | test`

The prototype proves the toolchain works end-to-end across four real use cases.

---

## 2. Architecture: Three-Phase Roadmap

```
Phase 1 (now)          Phase 2 (v1)            Phase 3 (v2)
─────────────────      ─────────────────────   ─────────────────────
Babel prototype    →   Custom JS compiler   →  LLVM native backend
TypeScript parser       Recursive descent        C++17 + LLVM 17
Prettier formatter      Hand-written lexer       IR code generator
Jest test runner        No external deps         <50ms compile target
```

**Why this order**: get a working language fast (Phase 1), prove correctness with a zero-dep JS compiler (Phase 2), then optimize for native performance (Phase 3). Dart took the same path (GWT → dart2js → Dart Native). The lesson: design the type system for native from day one, even if Phase 1 doesn't enforce everything.

---

## 3. Type System Design

### Philosophy: Go Simplicity + Dart Null Safety + Rust Sum Types

The type system is minimal and sound — the opposite of TypeScript's deliberately-unsound design.

**Banned from SJS permanently**:
- `any` (use `dynamic` instead — runtime-checked, not a soundness hole)
- Mapped types (`{ [K in keyof T]: ... }`)
- Conditional types (`T extends U ? A : B`)
- Template literal types
- `infer`, `namespace`, TypeScript-style `enum`
- Intersection types (`A & B`) — use interfaces instead

**The 10 types**:

| SJS Type | JS Runtime | LLVM IR |
|----------|-----------|---------|
| `number` | `Number` | `double` |
| `string` | `String` | `{i8*, i64}` |
| `boolean` | `Boolean` | `i1` |
| `bigint` | `BigInt` | `i64` or GMP |
| `symbol` | `Symbol` | `ptr` |
| `void` | `undefined` | `void` |
| `null` | `null` | `ptr (null)` |
| `never` | (unreachable) | `!` (LLVM unreachable) |
| `dynamic` | any JS value | `{tag, ptr}` (Phase 3) |
| `object T` | heap object | struct |

**Sound null safety** (Dart 2.12 style):
- Non-nullable by default: `string` cannot be null
- `T?` = nullable: `string?` = `string | null | undefined`
- `?.` and `??` operators type-checked against `T?` annotations
- No `!` non-null assertion operator — use narrowing instead

**Sum types** (Rust-style ADTs):
```sjs
type Result<T> = Ok(T) | Err(string)
type Shape = Circle({ radius: number }) | Rect({ w: number, h: number })
```
Compiled to `{ _tag: "Ok", _0: value }` in Phase 1; maps to LLVM tagged union in Phase 3.

**Generics**: monomorphized at compile time (Rust-style), not type-erased. Constraints via `<T: Interface>`.

**Structural interfaces**: Go-style implicit satisfaction — if the shape matches, it satisfies.

---

## 4. Demo Projects (Sprint Deliverables)

### 4a. Data Structures / Algorithms (`prototype/examples/algorithms/`)
Proves: typed generics, comparators, null-safe optional chaining

- `linked-list.sjs` — `LinkedList<T>`, `Node<T>` with `prev?/next?`
- `binary-search-tree.sjs` — `BST<T>` with typed comparator `(a: T, b: T) => number`
- `sorting.sjs` — `quicksort<T>`, `mergesort<T>`, `heapsort<T>`, `binarySearch<T>`
- `graph.sjs` — `Graph<T>`, BFS/DFS, `shortestPath`, `topologicalSort`
- `stack-queue.sjs` — `Stack<T>`, `Queue<T>`, `PriorityQueue<T>` (min-heap)
- `hash-map.sjs` — `HashMap<K,V>` with separate chaining

### 4b. Web App (`prototype/examples/web/`)
Proves: DOM typing, LocalStorage, CSS custom properties, no build tool needed

- Todo app with typed state, filters, priority levels
- `createStorage<T>()` generic factory
- `style.css` with dark mode + responsive layout

### 4c. JSX / React Component (`prototype/examples/jsx/`)
Proves: JSX-on-by-default, typed props, React integration

- Markdown editor with live preview
- Configurable pragma via `superjs.config.json` (`jsxFactory: "React.createElement"`)
- Typed component props via interfaces

### 4d. Node.js CLI Tool (`prototype/examples/node/`)
Proves: native Node.js imports, typed interfaces, real-world utility

- Code statistics analyzer — walks directories, counts lines by extension
- Typed `FileStats`, `ProjectStats`, `CliOptions` interfaces
- ASCII table output + JSON mode

---

## 5. CLI Design

```
superjs build  --source | --dir  [--outDir] [--target] [--watch]
               [--strict] [--no-emit] [--sourcemap] [--json]
superjs lint   --source | --dir  [--fix] [--json]
superjs format --source | --dir  [--check]
superjs test   [--source] [--watch] [--coverage]
```

Project config via `superjs.config.json` (CLI flags override):
```json
{ "target": "es2022", "outDir": "./dist", "jsxFactory": "React.createElement", "strict": false }
```

---

## 6. Implementation Gaps Fixed in Sprint

Problems found in the original prototype (Babel wrappers masquerading as a language):

1. **`lint --dir` missing** — added recursive `.sjs` walker + per-file diagnostics
2. **`format --dir` missing** — added recursive walker with count summary
3. **`test` flags stub** — added `--watch` and `--coverage` stubs with clear messaging
4. **ANSI colors in CLI** — colored success/failure with elapsed-ms timing
5. **Directory compile `sourceRoot` bug** — fixed relative path calculation
6. **`superjs.config.json` support** — `loadProjectConfig()` with CLI override precedence

Test suite: 181 tests passing across 13 suites after fixes.

---

## 7. ECMAScript Compliance Reference

`specs/ecmascript/` — complete highlights for ES5 through ES2025:
- `section-map.md` — maps all ECMA-262 sections relevant to SJS features and diagnostic codes
- `{version}/highlights.md` — per-version feature reference with SJS examples and ECMA-262 anchors

---

## 8. Key Decisions

| Decision | Rationale |
|----------|-----------|
| `dynamic` not `any` | `any` is a soundness hole; `dynamic` is runtime-checked (Dart-style) |
| Sound null safety from day 1 | LLVM backend requires non-nullable types for pointer safety |
| Sum types, not TS discriminated unions | Cleaner syntax; maps directly to LLVM tagged unions |
| Structural interfaces, not nominal | Go proved this works at scale without verbosity |
| Monomorphized generics | Required for LLVM; forces better designs than type-erased generics |
| JSX on by default | SJS is a JS replacement; JSX is JS standard at this point |
| Banned intersection `A & B` | Ambiguous with sum types; structural interfaces serve the same purpose |
| ES2025 as primary target | Preserves modern syntax; `preset-env` handles backward compatibility |

---

## 9. Out of Scope (v1)

- Module bundling (use Vite/Webpack alongside)
- Decorators beyond stripping (semantics deferred to Phase 2)
- `import.meta` type checking
- Cross-file type inference (each file type-checked independently in Phase 1)
- Monorepo / >100 file projects
- LSP / editor integration (planned for v1.1)
