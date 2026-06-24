---
title: Performance Benchmarks
sidebar_position: 1
description: SuperJS compiler performance numbers — cold/warm compile times and comparisons to tsc and esbuild.
section: perf
---

# Performance Benchmarks

SuperJS compiler throughput on real hardware. Numbers below are **measured**, not estimated.

**Environment:** macOS arm64, Node v24.14.1, 10 CPU cores — 2026-06-24.

Reproduce locally:

```bash
cd superjs && pnpm nx build compiler
cd .. && node scripts/gen-bench-corpus.mjs
node scripts/bench.mjs   # writes benchmarks/results.json
```

## Stage 6 targets

| Metric | Target | Measured (corpus) | Status |
|--------|--------|-------------------|--------|
| Cold compile (~10k LOC) | ≤ 2s | **81.5 ms** | ✓ |
| Warm rebuild (avg 5×) | ≤ 100 ms | **56.5 ms** | ✓ |
| LSP idle memory (100k LOC) | ≤ 250 MB | _pending_ | — |
| LSP P99 hover | ≤ 200 ms | _pending_ | — |

## Compile time

Synthetic corpus: **~14k LOC** of functions, sum types, and `match` arms (`benchmarks/corpus-10k.sjs`).
Stdlib corpus: all `superjs/libs/stdlib/src/modules/*.sjs` (**382 LOC**, 11 files).

| Input | LOC | Cold compile | Warm (avg 5×) |
|-------|-----|--------------|---------------|
| stdlib | 382 | 19.9 ms | 3.7 ms |
| synthetic corpus | 14,000 | 81.5 ms | 56.5 ms |

### vs TypeScript tooling (same synthetic TS corpus)

Comparisons use an equivalent **TypeScript** file (`benchmarks/corpus-10k.ts`) with the same function count and control flow (discriminated unions instead of SJS `match`). This is not apples-to-apples: SuperJS runs parse + typecheck + IR + codegen; `tsc` is typecheck-only; `esbuild` is transpile-only.

| Tool | Wall time (cold) | Relative to SJS cold |
|------|------------------|----------------------|
| **SuperJS** `compile()` | 81.5 ms | 1.00× |
| **tsc** `--noEmit` | 720.7 ms | 8.8× slower than SJS |
| **esbuild** transpile | 431.0 ms | 5.3× slower than SJS |

SJS cold compile is **~0.11×** the wall time of `tsc` and **~0.19×** `esbuild` on this corpus. Your mileage will vary with module graph size, import resolution, and source maps.

## LSP

| Metric | Value | Target | Notes |
|--------|-------|--------|-------|
| Idle memory (100k LOC) | _pending_ | ≤ 250 MB | Manual measurement — automation tracked separately |
| P99 hover latency | _pending_ | ≤ 200 ms | Manual measurement — automation tracked separately |

LSP benchmarks require loading a large workspace into `@superjs/lsp` and sampling heap + hover latency. Until that harness ships, compiler numbers above are the authoritative published metrics.

## Methodology

- **Cold:** first `compile()` call after process start, no persistent cache.
- **Warm:** average of 5 subsequent `compile()` calls on identical sources (in-memory incremental session).
- **Harness:** [`scripts/bench.mjs`](../../scripts/bench.mjs)
- **Corpus generator:** [`scripts/gen-bench-corpus.mjs`](../../scripts/gen-bench-corpus.mjs)
- **Committed results:** [`benchmarks/results.json`](../../benchmarks/results.json)

Per-phase lexer/parser/checker/codegen breakdown is not yet instrumented in the compiler pipeline.

_Last updated: 2026-06-24._
