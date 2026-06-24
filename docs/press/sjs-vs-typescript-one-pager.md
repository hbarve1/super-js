# SuperJS vs TypeScript — one pager

_For press / launch. Full comparison: [`docs/comparisons/sjs-vs-typescript.md`](../comparisons/sjs-vs-typescript.md)._

## One sentence

SuperJS is JavaScript with a **sound** type system — it removes TypeScript's unsound escape hatches instead of adding more configuration.

## When to choose SuperJS

- You want **provable null safety** without `strictNullChecks` footguns
- You're tired of `any` silently infecting call chains
- You want **sum types + exhaustive match** without discriminated-union ceremony
- You need a **smaller language** that's easier to teach and review

## When to stay on TypeScript

- You depend heavily on mapped/conditional types and library inference
- Your team needs the full npm `@types/*` ecosystem without wrappers
- You require a mature IDE/debugger story today (SJS DAP is post-1.0)

## Feature contrast

| | TypeScript | SuperJS |
|---|------------|---------|
| `any` | Allowed; propagates silently | **Banned** — use `dynamic` (explicit, lintable) |
| Nullability | Opt-in strict | **Non-null by default**; `T?` for nullable |
| Unions | Discriminated unions (manual) | **Sum types** + exhaustive `match` |
| Intersections | `A & B` | **Banned** — structural `type X extends A, B` |
| Conditional types | Core feature | **Banned** — use sum types |
| JSX | Config required | **On by default** |
| Output | Erased types | Clean ES2022 JS today |

## Benchmark snapshot

Synthetic ~14k LOC corpus (macOS arm64, Node 24):

| Tool | Cold wall time |
|------|----------------|
| SuperJS compile | **81 ms** |
| tsc `--noEmit` | 721 ms |
| esbuild transpile | 431 ms |

See [`docs/perf/`](../perf/index.md).

## Try it

```bash
npm install -g @superjsorg/cli
superjs init
superjs build
```

Playground: https://superjs.org/playground
