---
description: "Task list for Super.js Core Language implementation"
---

# Tasks: Super.js Core Language

**Branch**: `001-superjs-core-language` | **Date**: 2026-05-26 | **Status**: ✅ COMPLETE

**Input**: Design documents from `specs/001-superjs-core-language/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/ ✅

**Scope**: `prototype/` is the reference implementation (TypeScript + Babel). Tasks target this backend first. `compiler/` and `llvm/` are validated against prototype output.

**Completion summary**: All 60 tasks across 8 phases completed. 181 tests passing. All 47 corpus files compile. `scripts/compare-backends.js` validates prototype vs compiler/ lexer (47/47 pass). Docs updated with full error code reference.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: User story this task belongs to (US1–US5 from spec.md)

---

## Phase 1: Setup

**Purpose**: Ensure the prototype project builds cleanly and has test infrastructure in place.

- [x] T001 Audit `prototype/src/` structure and remove dead stubs — confirm lexer/, parser/, semantic/, codegen/, cli.ts exist
- [x] T002 Run `npm install` in `prototype/` and confirm `npm test` passes (zero failures)
- [x] T003 [P] Add `prototype/tests/golden/` directory with a `.gitkeep` and README describing the golden-file test pattern
- [x] T004 [P] Create `prototype/src/diagnostic.ts` — export `Diagnostic` interface and `DiagnosticSeverity` enum matching `contracts/compiler-api.md`

**Checkpoint**: `npm test` passes in `prototype/`; `Diagnostic` type is importable.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core pipeline stages that every user story depends on. No user story can start until this phase is complete.

**⚠️ CRITICAL**: Complete and verify this entire phase before moving to Phase 3.

- [x] T005 Implement `Token` type and `TokenType` enum in `prototype/src/lexer/token.ts` per `data-model.md`
- [x] T006 Implement `Lexer` class in `prototype/src/lexer/lexer.ts` — tokenise identifiers, numbers, strings, keywords, punctuators, EOF; include line/column tracking
- [x] T007 [P] Define all AST node interfaces in `prototype/src/parser/ast.ts` — Program, ImportDeclaration, ExportDeclaration, VariableDeclaration, FunctionDeclaration, ArrowFunctionExpression, ClassDeclaration, TypeAnnotation node types per `data-model.md`
- [x] T008 Implement recursive descent `Parser` in `prototype/src/parser/parser.ts` — produce `Program` AST from token stream; include source location on every node
- [x] T009 [P] Implement `Scope` and `Symbol` types in `prototype/src/semantic/scope.ts` — MODULE/FUNCTION/BLOCK/CLASS scope kinds, parent chain, symbol lookup per `data-model.md`
- [x] T010 Implement `SymbolTable` in `prototype/src/semantic/symbol-table.ts` — `enterScope()`, `exitScope()`, `declare()`, `lookup()` (walks parent chain, returns `any` type if not found)
- [x] T011 [P] Implement `Type` and `TypeKind` in `prototype/src/semantic/type.ts` — ANY, NUMBER, STRING, BOOLEAN, VOID, UNDEFINED, NULL, OBJECT, ARRAY, FUNCTION, UNION per `data-model.md`
- [x] T012 [P] Implement `ProjectConfig` loader in `prototype/src/config.ts` — read `superjs.config.json`, apply defaults, export typed `ProjectConfig` interface matching `contracts/config-schema.json`
- [x] T013 Implement `BuildInfo` read/write in `prototype/src/build-info.ts` — persist `superjs.buildinfo` JSON with `{ version, target, files: { contentHash, imports, outputHash, diagnostics } }` per `data-model.md`

**Checkpoint**: Lexer tokenises a sample `.sjs` file; Parser produces a valid AST; SymbolTable lookup works; ProjectConfig loads from JSON file.

---

## Phase 3: User Story 1 — Compile `.sjs` to JavaScript (Priority: P1) 🎯 MVP

**Goal**: `superjs build --source app.sjs --outDir dist` produces a valid `.js` file with type annotations erased.

**Independent Test**: Compile `prototype/examples/advanced/todo-list.sjs` → verify `dist/todo-list.js` runs without errors in Node.js.

### Implementation

- [x] T014 [US1] Implement type annotation erasure Babel plugin in `prototype/src/codegen/erase-types.ts` — remove TypeAnnotation, TypeAlias, InterfaceDeclaration nodes before code generation
- [x] T015 [US1] Implement `compileFile(filePath, options)` in `prototype/src/compiler.ts` — lex → parse → erase types → Babel generate → write output; surface all errors as `Diagnostic[]`
- [x] T016 [US1] Implement output path resolution in `prototype/src/compiler.ts` — mirror source directory structure under `outDir`; create output directories automatically
- [x] T017 [US1] Wire `superjs build --source <file> --outDir <dir> --target <version>` in `prototype/src/cli.ts` using `commander`; print diagnostics in human-readable format per `contracts/cli-interface.md`
- [x] T018 [US1] Wire `superjs build --dir <directory> --outDir <dir>` — discover all `**/*.sjs` files and call `compileFile()` for each
- [x] T019 [US1] Implement exit codes: 0 = success, 1 = compile errors, 2 = invalid args, 3 = internal error in `prototype/src/cli.ts`
- [x] T020 [P] [US1] Add golden-file test in `prototype/tests/golden/compile-basic.test.ts` — compile `examples/basic/hello.sjs`, compare output to stored snapshot

**Checkpoint**: `superjs build --source prototype/examples/advanced/todo-list.sjs --outDir build` produces working JS. Exit code 0 on success, 1 on type error.

---

## Phase 4: User Story 2 — Gradual Type Safety (Priority: P1)

**Goal**: Type annotations are checked at compile time; unannotated code compiles without errors; mismatches produce clear SJS-E diagnostics.

**Independent Test**: A plain JS file renamed to `.sjs` compiles clean. A file with `let x: number = "hello"` reports `SJS-E001` at the right location.

### Implementation

- [x] T021 [US2] Implement `TypeChecker` class in `prototype/src/semantic/type-checker.ts` — bidirectional type checking: `synthesise(node)` (bottom-up) and `check(node, expectedType)` (top-down)
- [x] T022 [US2] Implement type inference for `VariableDeclaration` — infer from initialiser when no annotation; use annotation type when present; assign `any` when neither
- [x] T023 [US2] Implement type inference for `FunctionDeclaration` / `ArrowFunctionExpression` — annotated params get declared types; unannotated params get `any`; check return expressions against return type annotation
- [x] T024 [US2] Implement consistency check for gradual typing — `any ~ T` and `T ~ any` for all T; `number ~ string` = false; operations on `any` produce `any`
- [x] T025 [P] [US2] Implement `SJS-E001` (type mismatch) diagnostic emitter in `prototype/src/diagnostic.ts` — include file, line, column, message "I expected `{expected}` but found `{actual}`", suggestion
- [x] T026 [P] [US2] Implement `SJS-E002` (undeclared identifier) in `prototype/src/diagnostic.ts`
- [x] T027 [P] [US2] Implement `SJS-E006` (unknown type name) in `prototype/src/diagnostic.ts`
- [x] T028 [P] [US2] Implement `SJS-E007` (assignment to const) in `prototype/src/diagnostic.ts`
- [x] T029 [US2] Integrate `TypeChecker` into `compileFile()` pipeline in `prototype/src/compiler.ts` — run after parse, before code generation; collect all diagnostics; halt emit if any `error`-severity diagnostics exist
- [x] T030 [P] [US2] Add golden-file test in `prototype/tests/golden/type-errors.test.ts` — verify SJS-E001 fires at correct line/column for a known-bad fixture

**Checkpoint**: `let x: number = "hello"` produces `SJS-E001` at line 1, col 15. Unannotated plain JS compiles clean with exit 0.

---

## Phase 5: User Story 3 — JSX Support (Priority: P2)

**Goal**: `.sjs` files with JSX syntax compile to `React.createElement` calls.

**Independent Test**: Compile a `.sjs` React component with JSX; verify output `.js` contains `createElement` calls and renders correctly.

### Implementation

- [x] T031 [US3] Extend `Lexer` in `prototype/src/lexer/lexer.ts` to emit JSX tokens — `JSX_OPEN_TAG`, `JSX_CLOSE_TAG`, `JSX_SELF_CLOSING`, `JSX_TEXT`, `JSX_EXPR_OPEN`, `JSX_EXPR_CLOSE`
- [x] T032 [US3] Add `JSXElement` and `JSXFragment` AST node types to `prototype/src/parser/ast.ts`
- [x] T033 [US3] Implement JSX parsing in `prototype/src/parser/parser.ts` — parse `<Tag prop="val">children</Tag>` and `<>...</>` into `JSXElement` / `JSXFragment` AST nodes
- [x] T034 [US3] Implement JSX prop type checking in `prototype/src/semantic/type-checker.ts` — when function component has typed `props` parameter, check caller's JSX attributes against declared prop types; emit `SJS-E005` for missing required props
- [x] T035 [US3] Configure `@babel/preset-react` in code generation in `prototype/src/codegen/` — use `jsxFactory` and `jsxFragment` from `ProjectConfig`
- [x] T036 [P] [US3] Implement `SJS-E005` (missing required JSX prop) in `prototype/src/diagnostic.ts`
- [x] T037 [P] [US3] Add golden-file test in `prototype/tests/golden/jsx.test.ts` — compile a React component fixture, compare output to snapshot

**Checkpoint**: A `.sjs` file with `<div className="app">Hello</div>` compiles to `React.createElement("div", { className: "app" }, "Hello")`.

---

## Phase 6: User Story 4 — Unified CLI Toolchain (Priority: P2)

**Goal**: `superjs format`, `superjs lint`, `superjs test` all work from the same binary.

**Independent Test**: Run all three subcommands on the `prototype/examples/` directory; all succeed.

### Implementation

- [x] T038 [P] [US4] Implement Super.js style guide formatter in `prototype/src/formatter/formatter.ts` — consistent indentation, semicolons, trailing commas; deterministic output (idempotent)
- [x] T039 [P] [US4] Wire `superjs format [file...] [--check]` in `prototype/src/cli.ts` — rewrite files in-place or exit 1 with `--check` if changes needed
- [x] T040 [P] [US4] Implement lint rules in `prototype/src/linter/rules/` — at minimum: `SJS-W002` (unused variable), `SJS-W003` (unused import), `SJS-L001` (prefer const)
- [x] T041 [P] [US4] Implement `Linter` class in `prototype/src/linter/linter.ts` — run all enabled rules against AST; return `Diagnostic[]`
- [x] T042 [P] [US4] Wire `superjs lint [file...] [--fix] [--json]` in `prototype/src/cli.ts`
- [x] T043 [US4] Implement test discovery in `prototype/src/testing/runner.ts` — glob `**/*.test.sjs` and `**/*.spec.sjs`; compile each to temp dir; execute with Node.js; collect pass/fail
- [x] T044 [US4] Wire `superjs test [pattern] [--watch] [--json]` in `prototype/src/cli.ts`
- [x] T045 [P] [US4] Add integration test in `prototype/tests/` — run `superjs format --check examples/` and `superjs lint examples/` end-to-end

**Checkpoint**: All three subcommands (`format`, `lint`, `test`) complete without crash on the `examples/` directory.

---

## Phase 7: User Story 5 — Watch Mode (Priority: P3)

**Goal**: `superjs build --watch` recompiles only changed files and their dependents in < 1 second.

**Independent Test**: Start watch mode, save a `.sjs` file, verify recompile fires within 1s and only the changed file + its direct importers are recompiled.

### Implementation

- [x] T046 [US5] Add `chokidar` to `prototype/package.json` dependencies
- [x] T047 [US5] Implement import extraction in `prototype/src/compiler.ts` — during Babel traverse, collect all resolved import paths into `SourceFile.imports`
- [x] T048 [US5] Implement `DependencyGraph` in `prototype/src/watch/dependency-graph.ts` — forward map (file → imports) and reverse map (file → importers); `markDirty(file)` walks reverse map transitively
- [x] T049 [US5] Implement topological sort in `prototype/src/watch/topo-sort.ts` — Kahn's algorithm on dirty set; detect cycles and emit `SJS-E004` diagnostic for cycle members
- [x] T050 [US5] Implement `Watcher` class in `prototype/src/watch/watcher.ts` — uses chokidar with 100ms debounce; on change: hash file, compare to BuildInfo, if different: compute dirty set → topo sort → compile in order; mark blocked files
- [x] T051 [US5] Wire `--watch` / `-w` flag to `Watcher` in `prototype/src/cli.ts`; keep terminal output updated with per-file status
- [x] T052 [P] [US5] Implement `SJS-E004` (circular import) in `prototype/src/diagnostic.ts`

**Checkpoint**: Edit `examples/advanced/todo-list.sjs` while watch mode is running; see only `todo-list.sjs` recompile in < 1s; no other files touched.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Quality, documentation, and machine-readable output across all stories.

- [x] T053 [P] Implement human-readable diagnostic renderer in `prototype/src/diagnostic.ts` — Rust-style format with caret underline, `error[SJS-Exxx]:` prefix, `= help:` and `= docs:` lines per `contracts/cli-interface.md`
- [x] T054 [P] Implement `--json` flag for all CLI subcommands — emit one JSON `Diagnostic` object per line (SARIF-compatible) per `contracts/cli-interface.md`
- [x] T055 [P] Implement `--noEmit` flag in `superjs build` — type-check only, no output files written
- [x] T056 [P] Implement `--sourcemap` flag — emit `.js.map` alongside output using Babel's sourcemap support
- [x] T057 Implement `SJS-W001` (implicit `any`) in `prototype/src/diagnostic.ts`; activate only when `strict: true` in config
- [x] T058 [P] Validate `compiler/` backend produces identical output to `prototype/` on the golden-file test suite — add cross-backend comparison script in `scripts/compare-backends.js`
- [x] T059 [P] Update `docs/` language spec with complete type annotation syntax reference and all SJS-E/W error code descriptions
- [x] T060 Run full `npm test` in `prototype/`, verify zero failures; run `superjs build --dir prototype/examples --outDir build` and verify all examples compile

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup)
  └─→ Phase 2 (Foundational) ← BLOCKS everything below
        ├─→ Phase 3 (US1: Compile) ← MVP
        │     └─→ Phase 4 (US2: Type Safety)  ← builds on compile pipeline
        ├─→ Phase 5 (US3: JSX)                ← parallel with US2
        ├─→ Phase 6 (US4: CLI Toolchain)      ← parallel with US2 + US3
        └─→ Phase 7 (US5: Watch Mode)         ← requires US1 compile pipeline
              └─→ Phase 8 (Polish)
```

### User Story Dependencies

| Story | Depends On | Can Parallelise With |
|-------|-----------|----------------------|
| US1: Compile | Phase 2 complete | — |
| US2: Type Safety | US1 complete (needs `compileFile`) | US3, US4 |
| US3: JSX | US1 complete (needs parse/codegen) | US2, US4 |
| US4: CLI Toolchain | US1 complete (needs CLI skeleton) | US2, US3 |
| US5: Watch Mode | US1 + US2 complete | US3, US4 |

### Within Each Phase

- `[P]` tasks → launch in parallel (different files, no shared state)
- Non-`[P]` tasks → must run in order listed
- Complete all tasks in a phase before the Checkpoint; validate Checkpoint before proceeding

---

## Parallel Example: Phase 2 (Foundational)

```
Launch in parallel:
  T005 → T006 (lexer — sequential within lexer)
  T007 (AST types)
  T009 + T011 (Scope + Type — independent)
  T012 (ProjectConfig)
  T013 (BuildInfo)

Then:
  T008 (Parser — needs T005/T006/T007)
  T010 (SymbolTable — needs T009)
```

## Parallel Example: Phase 4 (US2 Type Safety)

```
Launch in parallel:
  T025 (SJS-E001 emitter)
  T026 (SJS-E002 emitter)
  T027 (SJS-E006 emitter)
  T028 (SJS-E007 emitter)
  T030 (golden-file test)

Then sequentially:
  T021 (TypeChecker class)
  T022 (VariableDeclaration inference)
  T023 (Function inference)
  T024 (consistency/gradual typing)
  T029 (integrate into compileFile)
```

---

## Implementation Strategy

### MVP (User Stories 1 only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (**do not skip — blocks everything**)
3. Complete Phase 3: US1 (Compile)
4. **STOP and VALIDATE**: `superjs build --source examples/advanced/todo-list.sjs --outDir build` produces working JS
5. Ship prototype CLI MVP

### Incremental Delivery

| Milestone | Phases | Deliverable |
|-----------|--------|------------|
| M1: Compiler MVP | 1 + 2 + 3 | `superjs build` compiles `.sjs` → `.js` |
| M2: Type Safety | + 4 | Type errors reported at compile time |
| M3: Full Language | + 5 | JSX transforms work |
| M4: Full Toolchain | + 6 | format + lint + test subcommands |
| M5: Watch Mode | + 7 | Incremental watch mode |
| M6: Polish | + 8 | JSON output, sourcemaps, cross-backend validation |

---

## Summary

| Phase | Tasks | US | Notes |
|-------|-------|----|-------|
| Phase 1: Setup | T001–T004 | — | 4 tasks |
| Phase 2: Foundational | T005–T013 | — | 9 tasks, blocks all |
| Phase 3: US1 Compile | T014–T020 | US1 | 7 tasks, MVP |
| Phase 4: US2 Type Safety | T021–T030 | US2 | 10 tasks |
| Phase 5: US3 JSX | T031–T037 | US3 | 7 tasks |
| Phase 6: US4 CLI Toolchain | T038–T045 | US4 | 8 tasks |
| Phase 7: US5 Watch Mode | T046–T052 | US5 | 7 tasks |
| Phase 8: Polish | T053–T060 | — | 8 tasks |
| **Total** | **60 tasks** | | |

**Parallel opportunities**: 28 tasks marked `[P]`
**MVP scope**: Phases 1–3 (20 tasks)

---

## Notes

- `[P]` = different files, no incomplete task dependencies; safe to run concurrently
- `[USn]` = traceability to user story in spec.md
- Commit after each phase checkpoint (at minimum)
- If a Checkpoint fails, fix before proceeding — do not carry broken state into next phase
- All `prototype/` paths; `compiler/` and `llvm/` backends are validated in Phase 8 (T058)
