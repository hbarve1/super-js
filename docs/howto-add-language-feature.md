# HOWTO: Add a New Language Feature

This checklist covers the full end-to-end process for adding a new language feature to SuperJS — from grammar through implementation to documentation. Follow every step; partial implementations break spec/impl parity.

---

## Overview

A "language feature" is anything that requires changes in two or more of: grammar, lexer, parser, type-checker, IR lowering, codegen. Examples: a new statement form, a new type constructor, a new expression operator.

The SuperJS compiler is **hand-written end-to-end** — there is no Babel, no preprocessor, and no source-level transform step. Everything lives in an NX monorepo under `superjs/` (pnpm workspace, Vitest, TypeScript, ESM/`nodenext`). The compiler is a chain of libraries under `superjs/libs/`, each a published `@superjs/*` package:

| Library | Package | Responsibility |
|---|---|---|
| `libs/types` | `@superjs/types` | Shared AST node types (discriminated union, `*Node`-suffixed), `Token`, `Span`, `Diagnostic`, and the semantic `Type` model. |
| `libs/lexer` | `@superjs/lexer` | Hand-written lexer. `tokenize()` turns source into tokens per `specs/grammar.ebnf`. |
| `libs/parser` | `@superjs/parser` | Recursive-descent + Pratt expression parser with error recovery. `parse()` → `{ program, diagnostics }`. **New syntax is added here.** |
| `libs/checker` | `@superjs/checker` | Bidirectional type checker (`checker.ts`, `model.ts`, `subtype.ts`, `resolve.ts`, `scope.ts`). Emits diagnostics via a `DiagnosticBag`. |
| `libs/ir` | `@superjs/ir` | Lowers the typed AST → SJS-IR (an ESTree-subset JS AST). `lower.ts` erases type syntax and desugars sum types / match / JSX / param-props. IR stays at `esnext` level. |
| `libs/codegen-js` | `@superjs/codegen-js` | Prints SJS-IR → ES2022 JS + source maps (`emitter.ts`, `sourcemap.ts`). ES-target down-leveling (es5, etc.) happens here, not in IR. |
| `libs/compiler` | `@superjs/compiler` | Public API façade that orchestrates the whole pipeline. |

Before starting, read:
- `specs/mission.md` — principles (especially: ECMA superset, spec first, no silent unsafety)
- `specs/grammar.ebnf` — the current grammar (the formal contract)
- `specs/language/README.md` — language spec file index

---

## Step 1 — Update `specs/grammar.ebnf`

The grammar is the authoritative source for syntax and is the contract the lexer and parser implement.

1. Open `specs/grammar.ebnf`.
2. Find the section where your feature fits (top-level, expressions, statements, types, etc.).
3. Add the new production rule(s). Use the EBNF notation documented at the top of the file:
   - `|` alternation, `[ X ]` optional, `{ X }` zero or more, `"kw"` terminal, `<Name>` non-terminal
4. If your feature adds new keywords or tokens, add them to the relevant terminals/keywords section of the grammar.
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
   - **JS Lowering** — how the feature lowers to SJS-IR / output JS; include an input/output SJS↔JS pair and any emitted runtime helpers
   - **Diagnostic codes** — table of every `SJS-EXXX` code that this feature can trigger (reserve new codes first via `docs/howto-add-diagnostic.md`)
   - **Examples** — valid and invalid SJS with expected diagnostics

---

## Step 3 — Add to `specs/language/README.md` index

Open `specs/language/README.md` and add a row to the correct group's table:

```markdown
| `NNN-feature-name.md` | Feature description | Stage X — planned |
```

---

## Step 4 — Lexer changes (only if new tokens are needed)

Most features reuse existing tokens. If your feature introduces a genuinely new token or keyword:

1. Add the token/keyword rule in `superjs/libs/lexer` so `tokenize()` recognizes it (consistent with the terminals you added to `specs/grammar.ebnf`).
2. If you introduced a new token kind, ensure the `Token` model in `@superjs/types` (`libs/types`) covers it.
3. Add lexer tests as colocated Vitest specs (`superjs/libs/lexer/src/lib/*.spec.ts`).

If your feature uses only existing tokens, skip this step.

---

## Step 5 — Parser changes + AST node types

This is where new syntax is actually parsed — there is no preprocessor.

1. **Add AST node types** in `@superjs/types` (`superjs/libs/types`). Nodes are part of the discriminated AST union and follow the `*Node` naming convention. Add the new node(s) and their fields here so every downstream stage can reference them.

2. **Add the parsing logic** in `@superjs/parser` (`superjs/libs/parser`):
   - Statements / top-level forms: extend the relevant statement/program parsing path.
   - Expressions / operators: extend the Pratt expression parser (set precedence/associativity for new operators).
   - Preserve the parser's error-recovery behavior — on malformed input, report a diagnostic and recover rather than throwing.

3. Add parser tests as colocated Vitest specs (`superjs/libs/parser/src/lib/*.spec.ts`), covering both well-formed input and error recovery.

`parse()` returns `{ program, diagnostics }` — your new nodes should appear in `program`, and any syntax errors as `diagnostics`.

---

## Step 6 — Type-checker changes

Follow `docs/howto-add-typecheck-rule.md` for the detailed process. Summary:

1. Identify the new AST node types produced by your parser changes.
2. Add handling for those nodes in the checker (`superjs/libs/checker/src/lib/checker.ts`), using the supporting modules as needed: `model.ts` (Type model helpers), `subtype.ts` (subtyping), `resolve.ts` (type resolution), `scope.ts` (binding/lookup).
3. Implement inference/checking in the bidirectional style used across the checker.
4. Emit diagnostics through the `DiagnosticBag` — e.g. `this.bag.report({ code: Codes['E0XX'], span, params })`.
5. Add tests as colocated Vitest specs (`superjs/libs/checker/src/lib/checker.spec.ts` or a sibling spec).

---

## Step 7 — IR lowering

`@superjs/ir` (`superjs/libs/ir`) lowers the typed AST into SJS-IR, an ESTree-subset JS AST. `lower.ts` erases type syntax and desugars higher-level constructs (sum types, `match`, JSX, parameter properties) into plain JS-shaped IR.

1. In `superjs/libs/ir/src/lib/lower.ts`, add a lowering case for each new AST node:
   - If the feature is pure type syntax, lowering simply **erases** it.
   - If the feature is a runtime construct (a new expression/statement), desugar it into existing IR shapes where possible.
2. IR stays at `esnext` level — do **not** down-level for ES targets here (that is codegen's job).
3. Add IR tests as colocated Vitest specs in `superjs/libs/ir/src/lib/`.

---

## Step 8 — Codegen / printing (only if a new IR shape is introduced)

`@superjs/codegen-js` (`superjs/libs/codegen-js`) prints SJS-IR to ES2022 JS with source maps via `emitter.ts` (and `sourcemap.ts`).

- If Step 7 desugared into IR node kinds the emitter already prints, you do **not** need codegen changes.
- If you introduced a **new** IR node shape, add a printing case in `emitter.ts` and keep source-map spans accurate.
- ES-target down-leveling (es5, etc.) lives here, not in IR — account for the new construct across supported targets if relevant.
- Add codegen tests as colocated Vitest specs in `superjs/libs/codegen-js/src/lib/`.

---

## Step 9 — Error codes (if new codes are needed)

If your feature introduces new error conditions not covered by existing codes:

1. Follow `docs/howto-add-diagnostic.md` to reserve new code numbers in `specs/error-codes.md` and create the per-code spec file at `specs/error-codes/SJS-EXXX.md`.
2. Register the code in `superjs/libs/diagnostics/src/lib/registry.ts`.
3. Emit it from the relevant stage via the `DiagnosticBag`: `this.bag.report({ code: Codes['E0XX'], span, params })`.
4. Reference the new codes in your `specs/language/NNN-feature-name.md` §Diagnostic codes table.

---

## Step 10 — Tests

Each layer carries its own colocated Vitest specs, plus an end-to-end fixture.

| Layer | Location |
|---|---|
| Lexer (if changed) | `superjs/libs/lexer/src/lib/*.spec.ts` |
| Parser | `superjs/libs/parser/src/lib/*.spec.ts` |
| Type-checker | `superjs/libs/checker/src/lib/checker.spec.ts` (or sibling) |
| IR lowering | `superjs/libs/ir/src/lib/*.spec.ts` |
| Codegen (if changed) | `superjs/libs/codegen-js/src/lib/*.spec.ts` |
| End-to-end | `superjs/apps/e2e/fixtures/` (+ specs in `superjs/apps/e2e/src`) |

Add an **e2e fixture** under `superjs/apps/e2e/fixtures/`. The e2e suite is the golden-style fidelity layer: it asserts that a source compiles, produces deterministic output, and evaluates correctly.

Run tests from inside `superjs/`:

```bash
# a single library
pnpm nx test @superjs/parser

# everything across the workspace
pnpm nx run-many -t lint test typecheck build

# only what your change affected
pnpm nx affected -t test
```

Confirm zero failures before opening a PR.

---

## Full checklist

- [ ] `specs/grammar.ebnf` — new production rule(s) (and terminals/keywords) added
- [ ] `specs/language/NNN-feature-name.md` — spec file created from `_template.md`; all sections filled
- [ ] `specs/language/README.md` — index entry added
- [ ] New diagnostic codes reserved in `specs/error-codes.md` + per-code spec in `specs/error-codes/` (if needed)
- [ ] `superjs/libs/diagnostics/src/lib/registry.ts` — new codes registered (if needed)
- [ ] `@superjs/types` (`libs/types`) — new AST node type(s) added
- [ ] `@superjs/lexer` (`libs/lexer`) — new tokens/keywords + tests (if needed)
- [ ] `@superjs/parser` (`libs/parser`) — parsing logic + tests added
- [ ] `@superjs/checker` (`libs/checker`) — type rules + tests added
- [ ] `@superjs/ir` (`libs/ir`) — lowering case + tests added
- [ ] `@superjs/codegen-js` (`libs/codegen-js`) — printing case + tests added (if a new IR shape was introduced)
- [ ] `superjs/apps/e2e/fixtures/` — end-to-end fixture added
- [ ] `pnpm nx run-many -t lint test typecheck build` passes (or `pnpm nx affected -t test`) — zero failures
- [ ] PR description references the spec file and the stage this feature belongs to
