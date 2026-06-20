# WS-A4a: Language tour — 20 lessons

**Branch:** `feature/v1.0-tour`  
**Effort:** large  
**Deps:** WS-A3 (docs site infra merged first)  
**PR base:** `main`

## Objective

Write 20 Markdown lessons for `superjs/apps/docs/src/content/docs/tour/`.
Each lesson ≤5 min reading time, self-contained, contains at least one SJS code block
that compiles and runs in the playground.

## Context

- Docs site: `superjs/apps/docs/` (built by WS-A3)
- Playground: `superjs/apps/website/` — existing Next.js site with SJS playground
- Language reference: `specs/language/` — 40+ `.md` files, one per feature
- Grammar: `specs/grammar.ebnf`
- Mission: `specs/mission.md`
- Stdlib: `superjs/libs/stdlib/src/modules/*.sjs`
- Init templates: `superjs/apps/cli/src/lib/templates.ts`

## Lesson sequence

| # | File | Topic | Key features |
|---|------|-------|-------------|
| 01 | `01-hello-world.md` | Hello world | `superjs check`, basic `print`, string |
| 02 | `02-variables-and-types.md` | Variables + types | `const`/`let`, primitives, type annotations |
| 03 | `03-functions.md` | Functions | arrow + named, type params, return types |
| 04 | `04-control-flow.md` | Control flow | `if`/`else`, ternary, narrowing in branches |
| 05 | `05-null-safety.md` | Null safety | `T?`, `?.`, `??`, narrowing pattern |
| 06 | `06-pattern-matching.md` | Pattern matching | `match` expression, exhaustiveness |
| 07 | `07-sum-types.md` | Sum types: Result, Option | `type Result<T,E>`, variant constructors |
| 08 | `08-interfaces.md` | Records + interfaces | `interface`, structural typing, readonly |
| 09 | `09-generics.md` | Generics | `<T>`, generic functions + classes |
| 10 | `10-classes.md` | Classes | `class`, `private`/`public`, `implements` |
| 11 | `11-modules.md` | Modules | `import`/`export`, index barrel, paths |
| 12 | `12-async-await.md` | Async/await | `async`, `await`, `Promise<T>`, L015 |
| 13 | `13-jsx.md` | JSX | JSX elements, components, props typing |
| 14 | `14-calling-js-from-sjs.md` | Calling JS from SJS | `dynamic`, JS interop pattern |
| 15 | `15-dynamic-and-schema.md` | `dynamic` + Schema | `std-schema` validators, `parse()→Result` |
| 16 | `16-errors-and-result.md` | Errors + Result | prefer-result-over-throw, chaining |
| 17 | `17-iterators-and-for-of.md` | Iterators + for...of | `for...of`, generator functions |
| 18 | `18-serverless-handlers.md` | Serverless handler patterns | `workers-api`/`lambda-handler` templates |
| 19 | `19-tooling-tour.md` | Tooling tour | `check`, `build`, `lint`, `format`, `lsp`, `init` |
| 20 | `20-migrating-a-ts-file.md` | Migrating a TS file | `superjs migrate from-prototype`, common rewrites |

**IMPORTANT:** Lesson 18 is "Serverless handler patterns" — NOT decorators. Decorators are not in the SJS spec.

## Frontmatter format (Astro Starlight)

```markdown
---
title: '01 — Hello world'
description: 'Write and run your first SuperJS program.'
sidebar:
  order: 1
---

# Hello world

...lesson content...
```

## Content requirements per lesson

Every lesson must have:
1. **1-sentence goal** at the top (what you'll learn)
2. **Code block(s)** — at minimum one `sjs` fenced block that compiles clean
3. **Key takeaway** — 2–3 bullet points at the end
4. **"Try it" link** — `[Open in playground](https://superjs.dev/playground?code=...)`
   - URL-encode the minimal example
   - For lesson 18: add `?mode=workers` for the Workers example
5. **"Next"** link to following lesson

## Lesson 18 special requirements

Lesson 18 covers the `workers-api` and `lambda-handler` init templates:

```sjs
// Cloudflare Workers handler
export async function fetch(request: dynamic, env: dynamic): Promise<dynamic> {
  const url = new URL(request.url as string)
  match url.pathname {
    "/health" => new Response("ok", { status: 200 })
    _ => new Response("not found", { status: 404 })
  }
}
```

```sjs
// AWS Lambda handler
export async function handler(event: dynamic, context: dynamic): Promise<dynamic> {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Hello from SJS Lambda" })
  }
}
```

Show playground Workers demo mode for the Workers example.
Reference `examples/mvb-fastify/` (WS-A8) as the full-stack companion.

## Implementation steps

1. Confirm `superjs/apps/docs/src/content/docs/tour/` directory exists (from WS-A3).
2. Write all 20 `.md` files in order (01 through 20).
3. For each code block, verify it compiles: `superjs check <snippet>` or paste into playground.
4. Verify playground links resolve (manually test 3–4).
5. Run `nx build docs` — confirm all 20 lessons appear in sidebar under "Language Tour".
6. Check each lesson reads in ≤5 min (aim for 300–500 words + code).

## Acceptance criteria

- [ ] 20 files in `superjs/apps/docs/src/content/docs/tour/` with correct filenames
- [ ] All sidebar labels correct; ordered 01–20
- [ ] Every lesson has a playground link
- [ ] Lesson 18 is "Serverless handler patterns" (NOT decorators)
- [ ] Every SJS code block compiles without error (verified via `superjs check`)
- [ ] Each lesson ≤ 5 min reading (≤ 600 words + code)
- [ ] Lesson 20 references `superjs migrate from-prototype`
- [ ] `nx build docs` → tour section renders fully
- [ ] No broken internal links (lychee check)

## Notes

- Read `specs/language/*.md` for accurate SJS syntax — do NOT invent syntax
- Lesson 13 (JSX): SJS supports JSX per `specs/language/039-jsx.md`; if unsure about current support level, mark as "requires `--jsx` flag" and keep example minimal
- Lesson 19: reference real CLI subcommands from `superjs/apps/cli/src/main.ts`
- Do NOT write lesson on "decorators" — banned in SJS (ADR-004)
