# WS-A4b: Migration guide (TypeScript → SJS)

**Branch:** `feature/v1.0-migration`  
**Effort:** medium  
**Deps:** WS-A3 (docs site infra merged first)  
**PR base:** `main`

## Objective

Write the TypeScript → SuperJS migration guide at
`superjs/apps/docs/src/content/docs/migration/`.
3 parts: syntax rewrites, idiom changes, library ecosystem.

## Context

- Docs site scaffold from WS-A3
- Banned TS constructs: `specs/language/007-banned-features.md`, `specs/design/ADR-004-banned-ts-constructs.md`
- Null safety: `specs/language/001-null-safety.md`
- Sum types: `specs/language/002-sum-types.md`
- `dynamic` type: `specs/language/004-dynamic.md` + `specs/dts-dynamic-reasons.md`
- Error codes for banned constructs: `specs/error-codes/SJS-E004.md` through `SJS-E013.md`
- `superjs migrate from-prototype` CLI (WS-A5) — reference it in Part 3

## File structure

```
superjs/apps/docs/src/content/docs/migration/
  index.md            # overview + quick-start "first file" walkthrough
  01-syntax.md        # Part 1: syntax rewrites
  02-idioms.md        # Part 2: idiom changes
  03-library.md       # Part 3: library ecosystem + wrappers
```

## Part 1 — Syntax rewrites (`01-syntax.md`)

Cover every banned TS construct with a before/after table:

| TypeScript | SuperJS | Error code |
|-----------|---------|-----------|
| `any` | `dynamic` | SJS-E004 |
| `A & B` (intersection) | `interface C extends A, B {}` | SJS-E005 |
| `T extends U ? A : B` (conditional) | sum type + `match` | SJS-E008 |
| `infer T` | not supported — use sum type | SJS-E009 |
| `enum Color { Red, Blue }` | `type Color = Red \| Blue` | SJS-E010 |
| `value!` (non-null assertion) | narrow with `if` | SJS-E011 |
| `namespace Foo {}` | ES module | SJS-E012 |
| `{ [key: string]: T }` mapped type | `interface { [key: string]: T }` | SJS-E006 |
| `type Alias = ...` union alias | direct union `T \| U` | n/a |
| Decorators `@Decorator` | not supported | SJS-E004 (banned) |
| `interface Foo { bar?: T }` | `interface Foo { bar: T? }` | n/a |

Each row: show TypeScript code, show SJS equivalent, link to error-code page.

## Part 2 — Idiom changes (`02-idioms.md`)

Cover:

1. **Error handling** — `try/catch` → `Result<T,E>` pattern
   ```typescript
   // TypeScript
   function parse(s: string): Config {
     try { return JSON.parse(s) }
     catch (e) { throw new Error('parse failed') }
   }
   ```
   ```sjs
   // SuperJS
   function parse(s: string): Result<Config, string> {
     const raw: dynamic = JSON.parse(s)
     if (!isConfig(raw)) return Err("parse failed")
     return Ok(raw as Config)
   }
   ```

2. **Null handling** — `undefined` checks → `T?` + narrowing + `?.` + `??`
3. **Sum types** — object literal discriminated unions → `type T = A(...) | B(...)`
4. **`as` cast** — use `as T` only for `dynamic` narrowing; structural inference handles the rest
5. **`const enum`** → sum type with no payload
6. **Generic constraints** — `T extends string` becomes `<T: string>` (if supported) or structural interface
7. **Module augmentation** — not supported; use wrapper patterns instead
8. **`import type`** — becomes regular `import` (SJS erases types at emit)

## Part 3 — Library ecosystem (`03-library.md`)

Cover:

1. **Using JS libraries** — `import { foo } from 'some-js-lib'` → type as `dynamic`, narrow with Schema
2. **`@superjs/types-*` wrappers** — typed SJS bindings for top npm packages
   - List the wave-1 backends (fastify, express, hono, pg, prisma, zod, etc.)
   - Link to compat matrix (WS-A4e)
3. **`superjs migrate from-prototype`** — run it on an existing `.sjs` codebase to auto-rewrite prototype-layout imports (reference WS-A5)
4. **Gradual migration strategy**:
   - Rename `.ts` → `.sjs` one file at a time
   - Fix SJS-E* errors (banned constructs first)
   - Replace `any` with `dynamic` + Schema at boundaries
   - Convert `enum` to sum types
   - Replace `try/catch` throw patterns with Result returns

## Frontmatter

```markdown
---
title: 'Migration Guide'
description: 'Migrate a TypeScript codebase to SuperJS step by step.'
sidebar:
  order: 0
---
```

## Implementation steps

1. Read `specs/language/007-banned-features.md` and all `SJS-E00*.md` pages.
2. Write `index.md` — "your first file" walkthrough (take a 30-line TS file, convert it, walk through each change).
3. Write `01-syntax.md` — full banned-construct table with code examples.
4. Write `02-idioms.md` — idiomatic rewrites for common TS patterns.
5. Write `03-library.md` — JS interop + wrappers + migration tooling.
6. Run `nx build docs` — confirm migration section renders.
7. Check each SJS code block compiles: `superjs check <snippet>`.

## Acceptance criteria

- [ ] 4 files in `migration/` (index + 3 parts)
- [ ] Every banned TS construct has a before/after SJS example + error code link
- [ ] `index.md` has end-to-end conversion example (≥20 lines TS → SJS)
- [ ] `03-library.md` references `superjs migrate from-prototype` and compat matrix
- [ ] All SJS code blocks compile clean
- [ ] `nx build docs` → migration section renders with correct sidebar order
- [ ] No broken internal links

## Notes

- Do NOT claim decorators are "coming soon" — they are explicitly banned per ADR-004
- Intersection `A & B` IS banned — use interface extension
- `as T` cast IS allowed in SJS for `dynamic` → `T` narrowing (different from TS `any` cast)
- Check `specs/design/ADR-004-banned-ts-constructs.md` for the full authoritative list
