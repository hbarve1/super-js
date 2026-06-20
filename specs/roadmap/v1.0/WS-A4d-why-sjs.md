# WS-A4d: "Why SJS" page

**Branch:** `feature/v1.0-why-sjs`  
**Effort:** small  
**Deps:** WS-A3 (docs infra), WS-A8 (mvb-fastify example, for demo link)  
**PR base:** `main`

## Objective

Write `superjs/apps/docs/src/content/docs/why/index.md` — a persuasive, honest comparison page
explaining what SuperJS is for, what it trades away, and why you'd choose it.

## Context

- Mission: `specs/mission.md` — read first
- Language design decisions: `specs/design/ADR-*.md`
- `dynamic` rationale: `specs/language/004-dynamic.md`, `specs/dts-dynamic-reasons.md`
- Banned constructs: `specs/design/ADR-004-banned-ts-constructs.md`
- mvb-fastify demo: `examples/mvb-fastify/` (built in WS-A8)

## Page structure

```markdown
---
title: 'Why SuperJS'
description: 'When to choose SuperJS, what it trades away, and how it compares to alternatives.'
---

# Why SuperJS

## The one-sentence pitch
[1 sentence. E.g.: "SuperJS is TypeScript with sum types, null safety, and no escape hatches."]

## What SJS solves
[3–4 specific developer pain points TypeScript doesn't solve]
- The `any` escape hatch erodes type safety over time
- `null` and `undefined` are distinct, often conflated
- No exhaustiveness checking on discriminated unions without workarounds
- Error handling via `throw` makes error types invisible

## 5-minute backend demo
[Embed the mvb-fastify example or link to it. Show a 15–20 line SJS snippet that demos sum types + Result + null safety together in a real Fastify route.]

## What SJS wins vs TypeScript
[Concrete wins: exhaustive match, banned `any`, non-nullable defaults, Result-based errors, banned decorators/enums/intersection]

## What SJS loses vs TypeScript
[Honest. This section is mandatory. Examples:]
- No `any` escape hatch (intentional — forces explicit `dynamic`)
- No decorators
- No conditional / mapped / `infer` types
- Smaller ecosystem (fewer typed wrappers)
- No self-hosting yet
- Smaller community

## Comparison table: alternatives

| Feature | SJS | TypeScript | ReScript | Flow | Elm |
|---------|-----|-----------|----------|------|-----|
| Sum types | ✓ | partial (discriminated union) | ✓ | ✓ | ✓ |
| Null safety (non-nullable default) | ✓ | ✗ (strictNullChecks opt-in) | ✓ | ✓ | ✓ |
| Exhaustive match | ✓ | ✗ (manual workaround) | ✓ | ✓ | ✓ |
| JS interop | good (`dynamic`) | excellent | complex | good | limited |
| Compiles to JS | ✓ | ✓ | ✓ | ✗ | ✓ |
| npm ecosystem | via `@superjs/types-*` | native | via bindings | native | limited |
| Learning curve from TS | low | — | high | medium | high |

### ReScript comparison (detailed)
[A focused paragraph: ReScript is the closest peer. Key differences: SJS keeps JS syntax,
ReScript diverges heavily. SJS targets TS developers who want correctness without
learning a new language.]

### Why not Elm / PureScript?
[Brief: pure FP, no JS interop, very different paradigm. SJS is for TS shops moving incrementally.]

### Why not Civet / Imba?
[Brief: those are syntax extensions; SJS is a typed language with a different type system.]

## When to use SJS vs TypeScript

**Choose SJS when:**
- You want sum types + exhaustive match
- You want null safety without opt-in flags
- You want errors as values (Result) by default
- You're building a new backend service in Node/Workers/Lambda

**Stick with TypeScript when:**
- You need the full npm ecosystem with types immediately
- You have a large existing TypeScript codebase
- You need decorators (NestJS, Angular)
- You need conditional/mapped types for type gymnastics
```

## Implementation steps

1. Read `specs/mission.md` fully.
2. Read `specs/design/ADR-004-banned-ts-constructs.md`.
3. Read `specs/dts-dynamic-reasons.md`.
4. Write `index.md` following the structure above.
5. Use the `mvb-fastify` example from WS-A8 for the demo snippet (link to `examples/mvb-fastify/`).
6. Run `nx build docs` — confirm "Why SuperJS" appears in sidebar.

## Acceptance criteria

- [ ] `superjs/apps/docs/src/content/docs/why/index.md` exists
- [ ] Contains "What SJS loses" section (honest trade-offs — mandatory)
- [ ] Contains comparison table covering TS, ReScript, Flow, Elm (minimum)
- [ ] References `examples/mvb-fastify/` demo
- [ ] SJS code snippets compile clean
- [ ] "When to use" section gives clear guidance
- [ ] `nx build docs` → "Why SuperJS" renders correctly

## Notes

- Do NOT oversell — the "what SJS loses" section is as important as "what it wins"
- Do NOT claim things that aren't in the spec (e.g., WASM support, self-hosting, LLVM)
- If `examples/mvb-fastify/` isn't merged yet, use a synthetic 20-line snippet instead
