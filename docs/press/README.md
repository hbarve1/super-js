# Press kit (v1.0 launch)

Assets and copy for launch announcements. GA versions live under `docs/launch/` as drafts.

## Quick links

| Asset | Location |
|-------|----------|
| Logo / brand | _TBD — add SVG/PNG before GA_ |
| Website | https://superjs.org |
| Playground | https://superjs.org/playground |
| Why SJS | [`docs/why/`](../why/index.md) |
| Benchmarks | [`docs/perf/`](../perf/index.md) |
| 5-minute backend demo | [`examples/mvb-fastify/`](../../examples/mvb-fastify/) |
| TypeScript one-pager | [`sjs-vs-typescript-one-pager.md`](./sjs-vs-typescript-one-pager.md) |

## Elevator pitch (30 s)

SuperJS is a strict, sound superset of JavaScript — not TypeScript with a new extension.
It bans `any`, intersection types, and conditional types; adds sum types, exhaustive
`match`, and default null safety. One hand-written compiler ships today as clean ES2022;
native and WASM targets are on the roadmap.

## Key numbers (2026-06-24 bench)

- Cold compile ~14k LOC: **81 ms** (vs tsc typecheck ~721 ms on same corpus)
- LSP idle heap @ ~140k LOC: **196 MB** (target ≤ 250 MB)
- 30 `@superjs/types-*` wrappers for npm interop

## Screenshots

_Capture before GA:_

1. Playground with sum type + match
2. VS Code hover showing SJS type
3. `superjs check` pretty diagnostics
4. Docs tour lesson 18 (serverless mode)

## Contact

- GitHub: https://github.com/hbarve1/super-js
- Issues / security: see [`SECURITY.md`](../../SECURITY.md)
