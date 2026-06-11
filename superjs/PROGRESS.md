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
| 2 | libs/diagnostics `@superjs/diagnostics` | 0 | types | ✅ done |
| 3 | libs/config `@superjs/config` | 0 | (none) | ✅ done |
| 4 | libs/test-utils (private) | 0 | types, diagnostics | ⬜ todo |
| 5 | libs/runtime `@superjs/runtime` | 5 | — | ✅ done |
| 6 | libs/lexer `@superjs/lexer` | 1 | types, diagnostics | ✅ done |
| 7 | libs/parser `@superjs/parser` | 1 | lexer | ✅ done |
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

- 2026-06-11: Task 7 DONE — `@superjs/parser` (tier:1). cursor.ts (Cursor: peek/eat/expect, ASI consumeSemicolon, panic-mode synchronize, snapshot/restore for speculative parsing incl diagnostic rollback). parser.ts (full grammar: all statements/decls, classes/interfaces, type+sum decls, Pratt expressions w/ precedence table + right-assoc **, arrow detection via backtracking, match, JSX, type annotations incl union/nullable/array/tuple/function/object). parse() → {program, diagnostics}. 22 tests. **Key learnings:** (1) fin() builder MUST use `<const T extends object>` or kind literals widen to string, breaking discriminated unions. (2) access modifiers public/private/protected + `constructor` lex as identifiers (not keywords) — match by VALUE. (3) backtracking must roll back diagnostics (added DiagnosticBag.mark/rollback). (4) lexer: `<`,`>` added to NO_REGEX_AFTER so JSX </close> and /> lex as division not regex. (5) builder methods need precise return types (not Node/Statement) where AST fields are narrow.
- 2026-06-11: Task 6 DONE — `@superjs/lexer` (tier:1). char.ts (Unicode id classification, BiDi controls, whitespace/line-terminators by code point), lexer.ts (Lexer class: identifiers/keywords/private-ids, numbers all bases+separators+bigint+float/exp, strings w/ escapes, templates w/ nested ${} via brace/template stack, regex-vs-division by prevKind, maximal-munch operators, BiDi→L011, P001/P002 recovery, line/col + precededByLineBreak for ASI). tokenize() → {tokens, diagnostics}. 23 tests. **Gotcha:** Write tool renders pasted non-ASCII literals unreliably — use \u escapes / String.fromCharCode / codePointAt for unicode in source AND tests.
- 2026-06-11: Task 5 DONE — `@superjs/runtime` (tier:5, scope:external). panic.ts (SjsPanic, panic/assert/todo/unreachable), iterator.ts (attachIteratorSymbol self-iterable), inspect.ts (deterministic formatter, renders sum variants {_tag,_0} as Ok(42)/Err("x")/None, Map/Set/circular). 13 tests. Codegen will emit calls to these.
- 2026-06-10: Foundation started. NX TS-solution workspace (user-scaffolded). Added @nx/vite + @nx/eslint. nx.json task pipeline. Decisions locked above.
- 2026-06-10: Foundation DONE — nx.json targetDefaults (^build), eslint tier depConstraints (ADR-008), Vitest. **Gotcha:** generated lib `.eslintrc.json` has `"!**/*"` which un-ignores `node_modules`/`dist` → ESLint lints `node_modules/tslib`. Fix: add `"**/node_modules/**", "dist"` to each lib's `ignorePatterns`. APPLY TO EVERY GENERATED LIB.
- 2026-06-11: Task 3 DONE — `@superjs/config`. schema.ts (typed model + DEFAULT_CONFIG mirroring config-schema.json), validate.ts (dependency-free validator, partial-over-defaults merge, enum/bounds/unknown-key checks, output variants), load.ts (parseConfig, loadConfigFile, findConfigFile upward search, loadConfig). Self-contained (no types dep). 16 tests, all 4 targets green.
- 2026-06-11: Task 2 DONE — `@superjs/diagnostics`. registry.ts (42 codes P/E/W/L, code→severity/category/template/stage, `Codes` constants), factory.ts (formatMessage `{token}` interp, createDiagnostic, specUrlFor, DiagnosticBag collector w/ strict-promotion). 14 tests. **Workflow notes for every cross-lib dep:** (1) add `"@superjs/<dep>": "workspace:*"` to lib package.json, (2) `pnpm install`, (3) `nx sync` (enabled `sync.applyChanges:true` in nx.json → auto tsconfig refs). **ADR-008 correction:** tier:0 depConstraint must be `["tier:0"]` not `[]` — diagnostics/config/test-utils (tier:0) depend on types (tier:0). Updated root .eslintrc.json.
- 2026-06-10: Task 1 DONE — `@superjs/types`. Modules: span, token (keywords/banned-ids/punctuators), diagnostic (Severity/Diagnostic/fix), ast (full grammar discriminated union, `*Node`-suffixed syntactic types), sjs-type (semantic model, no `any`/intersection, `dynamic`+`nullable`), scope. 12 tests. build+typecheck+test+lint green. Convention: syntactic=`XTypeNode`, semantic=`XType`.
