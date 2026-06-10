# SuperJS NX Rewrite — Implementation Progress

**Branch:** `feat/nx-foundation`  ·  **Workspace:** `superjs/` (NX 22.7.5, pnpm, TS-solution)
**Started:** 2026-06-10. Fresh rewrite per `specs/design/ADR-008-nx-monorepo.md`.

## Ground rules

- **Fresh implementation.** `specs/` is the contract. `legacy/` is reference/oracle ONLY — never copy, re-implement clean.
- Old corpus = test spec. Reference via `git show legacy/pre-nx:<path>` or `legacy/...`.
- One commit per completed task (lib + passing tests) on `feat/nx-foundation`.
- All cross-lib imports via `@superjs/<name>` (TS-solution path aliases).

## Locked decisions (deviation log)

- **Vitest, not Jest.** ADR-008 chose Jest *for compatibility with old Jest tests*; fresh build copies nothing, so that rationale is void. Workspace is ESM/nodenext (Jest = high friction, Vitest = native). ADR-008 end-state is Vitest anyway.
- **Tier enforcement** via ESLint `@nx/enforce-module-boundaries` + `depConstraints` (ADR-008 §Dep constraints).
- **Bundler:** none (tsc via `@nx/js/typescript` plugin) per ADR.
- Package scope: `@superjs/*`. Root pkg `@org/source` (NX default, internal only — harmless).

## Tier model (dep direction: Tier N → Tier < N)

`tier:0` contracts · `tier:1` pipeline · `tier:2` backends · `tier:3` compiler API · `tier:4` tools · `tier:5` runtime · `tier:6` integrations · `tier:app`

## Phase 1 backlog (strict build order — ADR-008 §Build Order)

| # | Project | Tier | Depends on | Status |
|---|---------|------|-----------|--------|
| 0 | foundation (nx.json pipeline, eslint tier-gate, vitest) | — | — | ✅ done |
| 1 | libs/types `@superjs/types` | 0 | — | ✅ done |
| 2 | libs/diagnostics `@superjs/diagnostics` | 0 | types | ⬜ todo |
| 3 | libs/config `@superjs/config` | 0 | types | ⬜ todo |
| 4 | libs/test-utils (private) | 0 | types, diagnostics | ⬜ todo |
| 5 | libs/runtime `@superjs/runtime` | 5 | — | ⬜ todo |
| 6 | libs/lexer `@superjs/lexer` | 1 | types, diagnostics | ⬜ todo |
| 7 | libs/parser `@superjs/parser` | 1 | lexer | ⬜ todo |
| 8 | libs/checker `@superjs/checker` | 1 | parser | ⬜ todo |
| 9 | libs/ir `@superjs/ir` | 1 | checker | ⬜ todo |
| 10 | libs/codegen-js `@superjs/codegen-js` | 2 | ir | ⬜ todo |
| 11 | libs/compiler `@superjs/compiler` | 3 | config, codegen-js (+all) | ⬜ todo |
| 12 | apps/cli `superjs` | app | compiler | ⬜ todo |
| 13 | apps/e2e | app | cli | ⬜ todo |

## Key spec references per task

- **types:** AST nodes, Token, Span, Diagnostic, Type, ScopeEntry. `specs/grammar.ebnf`, `specs/language/`.
- **diagnostics:** 45 codes — `specs/error-codes.md` + `specs/error-codes/SJS-*.md` (P001–P099, E001–E019, W001–W012, L001–L011).
- **config:** `specs/config-schema.json`. loader/validator/defaults.
- **lexer:** `specs/grammar.ebnf` token rules. BiDi rejection (W012/L011, U+202A–E, U+2066–2069). ~500k tok/s.
- **parser:** recursive-descent + Pratt. `specs/parser-recovery.md` (sync sets, phrase/panic). Golden fixtures.
- **checker:** bidirectional (Dunfield-Krishnaswami). structural objects/interfaces, nominal classes. match exhaustiveness via pattern subtraction. `specs/language/` type rules.
- **ir:** TypedAST → SJS-IR. monomorphization, sum-type/closure/nullable lowering. `.sjsir` serialization. `specs/ecmascript/` codegen group.
- **codegen-js:** SJS-IR → ES2022 + sourcemaps v3 (fidelity ≥0.85). sum types `{ _tag, _0 }`.
- **compiler:** `compile/check/transform/typeAt/symbolAt/diagnosticsFor/parseTypeDecl/emitTypeDecl`. incremental cache (apiHash/docHash).
- **cli:** commands build, check, format, lint, init, add, doctor, explain, doc, verify, migrate (+ stubs test/lsp/repl). esbuild output.
- **e2e:** compile `legacy/.../examples/**/*.sjs` (move examples corpus into apps/e2e fixtures), grammar smoke, backend comparison vs legacy oracle.

## Session log

- 2026-06-10: Foundation started. NX TS-solution workspace (user-scaffolded). Added @nx/vite + @nx/eslint. nx.json task pipeline. Decisions locked above.
- 2026-06-10: Foundation DONE — nx.json targetDefaults (^build), eslint tier depConstraints (ADR-008), Vitest. **Gotcha:** generated lib `.eslintrc.json` has `"!**/*"` which un-ignores `node_modules`/`dist` → ESLint lints `node_modules/tslib`. Fix: add `"**/node_modules/**", "dist"` to each lib's `ignorePatterns`. APPLY TO EVERY GENERATED LIB.
- 2026-06-10: Task 1 DONE — `@superjs/types`. Modules: span, token (keywords/banned-ids/punctuators), diagnostic (Severity/Diagnostic/fix), ast (full grammar discriminated union, `*Node`-suffixed syntactic types), sjs-type (semantic model, no `any`/intersection, `dynamic`+`nullable`), scope. 12 tests. build+typecheck+test+lint green. Convention: syntactic=`XTypeNode`, semantic=`XType`.
