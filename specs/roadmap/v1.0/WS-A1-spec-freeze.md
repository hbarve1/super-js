# WS-A1: Spec assembly + freeze

**Branch:** `feature/v1.0-spec-freeze`  
**Effort:** large  
**Deps:** WS-A2 (error codes), WS-A4a (tour), WS-A4b (migration), WS-A4c (API ref), WS-A4d (why), WS-A4e (compat), WS-A4f (perf) — start LAST  
**PR base:** `main`

## Objective

Assemble `spec/language.md` (~150 pages) from the per-feature sections in `specs/language/`,
cross-reference every section to grammar productions and error codes,
polish prose, then merge the spec-freeze PR that locks the language for v1.0.

## Context

- Source sections: `specs/language/*.md` (40+ files)
- Grammar: `specs/grammar.ebnf`
- Error code registry: `specs/error-codes.md`
- Error code pages: `specs/error-codes/*.md`
- Grammar CI test: `superjs/libs/compiler/src/lib/parser.spec.ts` (or similar)
- Language tour: `superjs/apps/docs/src/content/docs/tour/` (from WS-A4a)

## Assembly process

### 1. Survey existing sections

```bash
ls -1 specs/language/ | sort
```

Expected sections (from Stage 6 spec):
- `lexical.md` — if missing, derive from `specs/grammar.ebnf` lexer section
- `syntax.md` — if missing, derive from grammar
- `type-system.md` — from Stage 1; check `specs/language/010-primitives.md` etc.
- `codegen-semantics.md` — from Stage 1; check `specs/language/050-js-lowering.md`
- `cli-surface.md` — from Stage 1; check `specs/language/009-tooling-surface.md`
- `incremental-model.md` — from Stage 1 Sprint 1.6
- `interop.md` — from Stage 2
- `tooling-surface.md` — `specs/language/009-tooling-surface.md`
- `stdlib-surface.md` — from Stage 4; may need to write from scratch using stdlib README
- `build-tool-integration.md` — from Stage 5; vite/esbuild/jest/vitest plugins

### 2. Write missing sections

For any section listed above that doesn't exist, write it from the existing code:
- `lexical.md` — extract from `specs/grammar.ebnf` EBNF rules for tokens
- `syntax.md` — extract grammar production rules
- `incremental-model.md` — document the `verify` command + watch mode architecture
- `stdlib-surface.md` — write from `superjs/libs/stdlib/README.md` + module source
- `build-tool-integration.md` — document vite/esbuild/jest/vitest plugins + transform()

### 3. Assemble `spec/language.md`

Create `specs/language.md` (at the `specs/` root level, NOT inside `specs/language/`):

```markdown
# SuperJS Language Specification

**Version:** 1.0  
**Status:** FROZEN  
**Frozen:** YYYY-MM-DD  

> This document is the canonical language reference for SuperJS 1.0.
> It was assembled from per-feature sections authored across Stages 1–5
> and frozen at v1.0. Changes after this point require a "spec exception"
> (written approval from all maintainers) plus an RFC for v1.1+.

---

## Table of Contents

1. [Lexical structure](#1-lexical-structure)
2. [Syntax](#2-syntax)
3. [Type system](#3-type-system)
4. [Code generation semantics](#4-code-generation-semantics)
5. [CLI surface](#5-cli-surface)
6. [Incremental compilation model](#6-incremental-compilation-model)
7. [Interop with TypeScript](#7-interop-with-typescript)
8. [Tooling surface](#8-tooling-surface)
9. [Standard library](#9-standard-library)
10. [Build tool integration](#10-build-tool-integration)

---

[assembled content per section]
```

For each section:
- Include the full content of the corresponding `specs/language/*.md` file(s)
- Add cross-reference to grammar productions: `> Grammar: see §2.3 FunctionDeclaration`
- Add cross-reference to error codes: `> Errors: SJS-E001, SJS-E003 (null safety violations)`

### 4. Grammar CI gate

Add a CI job that verifies `specs/grammar.ebnf` can parse every fixture in
`superjs/libs/compiler/src/lib/parser.spec.ts` (or `tests/fixtures/parser/`).

Look for an existing grammar validation tool. If none:
```typescript
// scripts/validate-grammar.ts
// Uses a simple EBNF validator (e.g., nearley, or custom)
// Asserts every parser test fixture parses successfully
```

At minimum, add a CI step that confirms the grammar file is syntactically valid EBNF.

### 5. Spec freeze commit

The freeze commit has this exact message:
```
spec: freeze for 1.0

Language specification frozen at v1.0 per stage-6 exit criteria.
Further changes require "spec exception" approval from all maintainers.
See docs/deprecation.md for the stability + deprecation policy.
```

Add to `specs/language.md` frontmatter:
```
**Status:** FROZEN
**Frozen-at:** <commit hash of this PR>
```

## Implementation steps

1. `ls -1 specs/language/ | sort` — inventory existing sections.
2. Read each section file to understand what's there.
3. Write any missing sections (priority: `lexical.md`, `incremental-model.md`, `stdlib-surface.md`, `build-tool-integration.md`).
4. Create `specs/language.md` by concatenating sections in order with TOC + cross-references.
5. Read `specs/grammar.ebnf` — verify it matches the assembled language spec.
6. Write `scripts/validate-grammar.ts` (minimal: parse EBNF file, assert no syntax errors).
7. Add grammar CI step to `.github/workflows/ci.yml`.
8. Commit `specs/language.md` with the freeze message.
9. Open PR `feature/v1.0-spec-freeze` → `main`.

## Acceptance criteria

- [ ] `specs/language.md` exists (~100+ pages; assembled from all `specs/language/*.md` sections)
- [ ] Every section cross-references grammar productions and error codes
- [ ] Freeze commit has exact message `spec: freeze for 1.0`
- [ ] `specs/grammar.ebnf` matches `specs/language.md` (no grammar productions missing)
- [ ] CI gate `validate-grammar` added to `.github/workflows/ci.yml`
- [ ] Missing sections (`incremental-model.md`, `stdlib-surface.md`, `build-tool-integration.md`) written
- [ ] `specs/language.md` has a clear "FROZEN" banner with date

## Notes

- Do NOT add new language features while assembling — assembly only (pull from existing `specs/language/*.md`)
- If a section is missing and cannot be derived from existing code, write a stub with `[TODO: fill from code]` marker
- Grammar CI gate: if a full EBNF parser is too complex to build, at minimum run `wc -l` and diff check to ensure the file hasn't regressed
- This is the LAST workstream — do not start until all A2, A4* workstreams are merged
