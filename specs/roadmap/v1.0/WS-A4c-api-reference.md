# WS-A4c: API reference (docgen)

**Branch:** `feature/v1.0-api-ref`  
**Effort:** medium  
**Deps:** WS-A3 (docs site infra merged first)  
**PR base:** `main`

## Objective

Implement `superjs docgen` CLI subcommand that extracts doc comments from SJS source
and generates Markdown API reference pages. Run it over `@superjs/stdlib` and committed
output to `superjs/apps/docs/src/content/docs/api/`.

## Context

- CLI app: `superjs/apps/cli/src/main.ts`
- Stdlib SJS source: `superjs/libs/stdlib/src/modules/*.sjs`
- Existing `superjs doc` command: check `superjs/apps/cli/src/main.ts` for current implementation
- Compiler API: `superjs/libs/compiler/src/index.ts` — `parse()`, `check()`, `compile()`
- LSP: `superjs/libs/lsp/` — existing hover/symbol extraction that parses doc comments

## What `superjs docgen` does

```
superjs docgen [--out <dir>] [<files...>]
```

For each `.sjs` file:
1. Parse with `parse()` from `@superjs/compiler`
2. Walk the AST for exported declarations: `function`, `class`, `type`, `interface`, `const`
3. Extract leading `/** ... */` doc comment
4. Emit one `.md` file per module to `--out <dir>`

Output per module:
```markdown
---
title: 'std-core'
description: 'Option<T> and Result<T,E> types with helpers'
sidebar:
  label: 'std-core'
---

# std-core

## Types

### `Option<T>`

```sjs
export type Option<T> = Some(T) | None
```

[doc comment here]

### `Result<T, E>`

...

## Functions

### `some<T>(value: T): Option<T>`

[doc comment]
```

## Implementation steps

### Step 1 — Check existing `superjs doc`

Read `superjs/apps/cli/src/main.ts` and find the `doc` subcommand.
If it already generates Markdown output, extend it rather than rewriting.
If it's stubbed, implement `docgen` as a new subcommand or extend `doc`.

### Step 2 — AST walker for exports

In `superjs/libs/compiler/src/lib/` (or a new `docgen.ts` file), implement:

```typescript
export interface DocEntry {
  name: string;
  kind: 'function' | 'class' | 'type' | 'interface' | 'const';
  signature: string;   // source text of the declaration header
  doc: string;         // extracted /** ... */ comment, empty string if none
  exported: boolean;
}

export function extractDocs(source: string, filename: string): DocEntry[]
```

Walk `parse(source).program.body`, for each exported node:
- Extract leading comment from `node.leadingComments` (if parser attaches them) or
  by scanning the source text for `/** */` blocks immediately before the node's span.
- Emit `DocEntry`.

### Step 3 — Markdown emitter

```typescript
export function renderApiPage(moduleName: string, entries: DocEntry[]): string
```

Groups entries by kind (Types, Functions, Constants, Classes, Interfaces).
Returns a Starlight-compatible `.md` string with frontmatter.

### Step 4 — CLI wiring

In `superjs/apps/cli/src/main.ts`, add:

```
superjs docgen [--out <dir>] [<glob...>]
```

Default `--out`: `./docs/api`
Default glob: `src/**/*.sjs`

### Step 5 — Run over stdlib

```bash
cd super-js
node superjs/apps/cli/dist/main.js docgen \
  --out superjs/apps/docs/src/content/docs/api \
  superjs/libs/stdlib/src/modules/*.sjs
```

Commit the generated output so CI doesn't need to run the generator on every PR
(static output is fine; regenerate when stdlib changes).

### Step 6 — Add doc comments to stdlib

If stdlib `.sjs` files lack `/** */` comments, add minimal ones:

```sjs
/** Returns `Some(value)` wrapping the given value. */
export function some<T>(value: T): Option<T> { ... }
```

Add comments to at least: `std-core`, `std-math`, `std-string`, `std-schema`.

### Step 7 — CI integration

Add to `.github/workflows/ci.yml`:

```yaml
- name: Regen API docs
  run: |
    node superjs/apps/cli/dist/main.js docgen \
      --out superjs/apps/docs/src/content/docs/api \
      superjs/libs/stdlib/src/modules/*.sjs
    git diff --exit-code superjs/apps/docs/src/content/docs/api \
      || (echo "API docs out of sync — run superjs docgen" && exit 1)
```

This ensures the committed output stays in sync with stdlib.

## Acceptance criteria

- [ ] `superjs docgen --help` works
- [ ] Running `superjs docgen --out <dir> superjs/libs/stdlib/src/modules/*.sjs` generates 11 `.md` files (one per stdlib module)
- [ ] Each generated page has: frontmatter, section per exported symbol, doc comment if present, SJS signature in code block
- [ ] Generated files committed to `superjs/apps/docs/src/content/docs/api/`
- [ ] `nx build docs` → API section renders with 11 module pages in sidebar
- [ ] CI step detects out-of-sync generated output
- [ ] At least `std-core`, `std-math`, `std-schema` have doc comments in their `.sjs` source

## Notes

- Parser may not attach leading comments to AST nodes — if not, scan source text for `/** */` blocks by position relative to node spans
- Do NOT generate API docs from TypeScript source files — SJS `.sjs` only
- The `superjs doc` command already exists; check whether it generates Markdown or just outputs to stdout
