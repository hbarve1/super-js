# HOWTO: Add a New Language Feature

This checklist covers the full end-to-end process for adding a new language feature to SuperJS — from grammar through implementation to documentation. Follow every step; partial implementations break spec/impl parity.

---

## Overview

A "language feature" is anything that requires changes in two or more of: grammar, parser, type-checker, codegen. Examples: a new statement form, a new type constructor, a new expression operator.

Before starting, read:
- `specs/mission.md` — principles (especially: ECMA superset, spec first, no silent unsafety)
- `specs/grammar.ebnf` — the current grammar
- `specs/language/README.md` — language spec file index

---

## Step 1 — Update `specs/grammar.ebnf`

The grammar is the authoritative source for syntax. It is consumed by Stage 1 parser implementation.

1. Open `specs/grammar.ebnf`.
2. Find the section where your feature fits (top-level, expressions, statements, types, etc.).
3. Add the new production rule(s). Use the EBNF notation documented at the top of the file:
   - `|` alternation, `[ X ]` optional, `{ X }` zero or more, `"kw"` terminal, `<Name>` non-terminal
4. If your feature adds keywords, add them to the keywords section and to `compiler/src/keywords/index.js`.
5. Note the section number — you'll reference it in the spec file.

Example addition:
```ebnf
(* New: pipe operator *)
<PipeExpression> ::= <Expression> "|>" <Expression>
```

---

## Step 2 — Write `specs/language/NNN-feature-name.md`

1. Find the next available number in the correct group in `specs/language/README.md`. See the README for group assignments (Group 1 = SJS extensions, Group 2 = type system, Group 3 = declarations, etc.).
2. Copy `specs/language/_template.md` to `specs/language/NNN-feature-name.md`.
3. Fill in all sections:

   - **Syntax** — paste the EBNF excerpt from `specs/grammar.ebnf`
   - **Semantics** — normative prose; what the feature means, when it is legal
   - **Type rules** — inference and checking rules in the notation shown in the template
   - **JS Lowering (Prototype)** — how the Babel-based prototype transforms this into output JS; include input/output SJS↔JS pair and any emitted helpers
   - **LLVM Lowering (Future)** — fill in when the LLVM backend (in `llvm/`) reaches this feature; leave the section as a skeleton otherwise
   - **Diagnostic codes** — table of every `SJS-EXXX` code that this feature can trigger (reserve new codes first via `docs/howto-add-diagnostic.md`)
   - **Examples** — valid and invalid SJS with expected diagnostics

---

## Step 3 — Add to `specs/language/README.md` index

Open `specs/language/README.md` and add a row to the correct group's table:

```markdown
| `NNN-feature-name.md` | Feature description | Stage X — planned |
```

---

## Step 4 — Parser changes

### 4a — Compiler (Phase 2, `compiler/`)

The hand-written parser lives in `compiler/src/parser/`. Each language construct has its own module under `compiler/src/parser/libs/`.

1. Create `compiler/src/parser/libs/your-feature/` with at minimum:
   - `index.js` — exports the parse function(s)
   - `parse-your-feature.js` — the recursive-descent parsing logic
   - `your-feature.test.js` — unit tests for the parser

2. The parser builds an AST. Add any new node types to `compiler/src/utils/ast-node-types.js` as string constants.

3. Wire the new parse function into the statement or expression dispatcher:
   - Statements: `compiler/src/parser/libs/statements/parse-statement.js`
   - Expressions: `compiler/src/parser/libs/expressions/index.js`
   - Top-level: `compiler/src/parser/libs/program/parse-program.js`

### 4b — Prototype (Phase 1, `backends/prototype/`)

The prototype uses Babel's parser, which already handles all ECMAScript syntax plus TypeScript. For SJS-specific syntax that Babel does not handle natively, the preprocessor (`backends/prototype/src/preprocessor/`) does source-level transformation before Babel sees the code.

- Sum types and match expressions are handled in `src/preprocessor/sumTypes.ts` and `src/preprocessor/matchExpr.ts`
- Access modifiers are handled in `src/preprocessor/accessModifiers.ts`

If your new feature uses syntax Babel cannot parse, add a preprocessor transform. If Babel can parse it already (e.g., new type annotations using existing TS syntax), skip the preprocessor and go straight to the type-checker.

---

## Step 5 — Type-checker changes

Follow `docs/howto-add-typecheck-rule.md` for the detailed process. Summary:

1. Identify the AST node types produced by your parser changes.
2. Add check method(s) to `backends/prototype/src/typeChecker/index.ts`.
3. Implement type inference/checking logic using `inferExprType()`, `resolveType()`, etc.
4. Emit diagnostics via `this.report(...)` with the correct `SJS-EXXX` code.
5. Add the same logic (or a TODO) to `compiler/src/type-checker/type-checker.js`.

---

## Step 6 — Codegen / lowering

### JS lowering (prototype)

If your feature requires output JS that differs from the SJS input (like sum types lowering to `{_tag, _0}`), implement the transform in:

- `backends/prototype/src/preprocessor/` — for syntax-level transforms before Babel
- `backends/prototype/src/compiler/index.ts` — for post-type-check transforms

Update `specs/language/NNN-feature-name.md` §"JS Lowering" with the exact input → output transformation.

### Golden file tests

For any feature that changes the compiled output, add golden file fixtures:

1. Create `backends/prototype/tests/golden/fixtures/your-feature.sjs` — the SJS input
2. Create `backends/prototype/tests/golden/fixtures/your-feature.expected.js` — the expected JS output
3. The golden test runner in `backends/prototype/tests/golden/golden.test.ts` picks these up automatically.

### LLVM lowering (future)

Leave `specs/language/NNN-feature-name.md` §"LLVM Lowering" as a skeleton unless you are actively working on the LLVM backend in `llvm/`. The LLVM backend is a separate component and does not need to be updated for Stage 0–2 work.

---

## Step 7 — Tests

Each layer needs its own tests:

| Layer | Location | Command |
|---|---|---|
| Parser (compiler) | `compiler/src/parser/libs/your-feature/*.test.js` | `npm test` in `compiler/` |
| Type-checker (prototype) | `backends/prototype/tests/typeChecker/your-feature.test.ts` | `npm test` in `backends/prototype/` |
| Golden (output) | `backends/prototype/tests/golden/fixtures/` | `npm test` in `backends/prototype/` |
| Preprocessor | `backends/prototype/tests/preprocessor/your-feature.test.ts` | `npm test` in `backends/prototype/` |

Run `npm test` in both `compiler/` and `backends/prototype/` and confirm zero failures before opening a PR.

---

## Step 8 — Update error codes if new codes are needed

If your feature introduces new error conditions not covered by existing codes:

1. Follow `docs/howto-add-diagnostic.md` to reserve new code numbers in `specs/error-codes.md`.
2. Create the per-code spec file at `specs/error-codes/SJS-EXXX.md`.
3. Reference the new codes in your `specs/language/NNN-feature-name.md` §Diagnostic codes table.

---

## Full checklist

- [ ] `specs/grammar.ebnf` — new production rule(s) added
- [ ] `specs/language/NNN-feature-name.md` — spec file created from template; all sections filled
- [ ] `specs/language/README.md` — index entry added
- [ ] New diagnostic codes reserved in `specs/error-codes.md` (if needed)
- [ ] New diagnostic spec files created in `specs/error-codes/` (if needed)
- [ ] `specs/language/060-error-codes-map.md` — updated with new code mappings (if needed)
- [ ] `compiler/src/keywords/index.js` — new keywords added (if needed)
- [ ] `compiler/src/utils/ast-node-types.js` — new node type constants added (if needed)
- [ ] `compiler/src/parser/libs/your-feature/` — parser module created
- [ ] `compiler/src/type-checker/type-checker.js` — rule added or TODO filed
- [ ] `backends/prototype/src/preprocessor/` — preprocessor transform added (if needed)
- [ ] `backends/prototype/src/typeChecker/index.ts` — check method(s) added
- [ ] `backends/prototype/tests/typeChecker/your-feature.test.ts` — test file created
- [ ] `backends/prototype/tests/golden/fixtures/` — golden fixtures added (if codegen changes)
- [ ] `npm test` passes in `compiler/` — zero failures
- [ ] `npm test` passes in `backends/prototype/` — zero failures
- [ ] PR description references the spec file and the stage this feature belongs to
