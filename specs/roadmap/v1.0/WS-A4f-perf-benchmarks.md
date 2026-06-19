# WS-A4f: Performance benchmarks page

**Branch:** `feature/v1.0-perf`  
**Effort:** medium  
**Deps:** WS-A3 (docs site infra merged first)  
**PR base:** `main`

## Objective

Implement a benchmark harness that measures SuperJS compiler performance
and publishes numbers to `superjs/apps/docs/src/content/docs/perf/index.md`.

## Performance targets (from Stage 6 Exit Criteria)

| Metric | Target | Notes |
|--------|--------|-------|
| Cold compile (10k LOC) | ≤ 2s | wall time, single-threaded |
| Warm rebuild (10k LOC) | ≤ 100ms | incremental, hot cache |
| LSP idle memory | ≤ 250MB | heap at 100k LOC loaded |
| LSP P99 hover | ≤ 200ms | response time |

## What to build

### 1. Benchmark harness (`scripts/bench.ts`)

```typescript
// scripts/bench.ts — run with: npx tsx scripts/bench.ts
import { compile } from '@superjs/compiler';
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';

interface BenchResult {
  name: string;
  loc: number;
  coldMs: number;
  warmMs: number;
  runs: number;
}

async function bench(name: string, files: Array<{filename: string, source: string}>, runs = 5): Promise<BenchResult> {
  const loc = files.reduce((n, f) => n + f.source.split('\n').length, 0);
  
  // Cold run
  const coldStart = performance.now();
  await compile(files, { sourceMap: 'none' });
  const coldMs = performance.now() - coldStart;

  // Warm runs
  const warmTimes: number[] = [];
  for (let i = 0; i < runs; i++) {
    const t = performance.now();
    await compile(files, { sourceMap: 'none' });
    warmTimes.push(performance.now() - t);
  }
  const warmMs = warmTimes.reduce((a, b) => a + b, 0) / warmTimes.length;
  
  return { name, loc, coldMs, warmMs, runs };
}
```

### 2. Test corpus

Generate or find a ~10k LOC SJS corpus:
- Use the entire `superjs/libs/stdlib/src/modules/*.sjs` (small, but good baseline)
- For 10k LOC: generate a synthetic SJS file with functions/classes/match expressions
  OR copy + repeat stdlib modules

Synthetic 10k LOC generator (`scripts/gen-bench-corpus.ts`):
```typescript
// Generates a single large .sjs file with N functions
function genCorpus(loc: number): string {
  const lines: string[] = [];
  const fns = Math.floor(loc / 10);
  for (let i = 0; i < fns; i++) {
    lines.push(
      `export function fn${i}(x: number, y: string): string {`,
      `  if (x > 0) return y + "${i}"`,
      `  return "neg_${i}"`,
      `}`,
      ``,
      `export type Tag${i} = A${i}(string) | B${i}(number)`,
      ``,
      `export function handle${i}(t: Tag${i}): string {`,
      `  match t {`,
      `    A${i}(s) => s`,
      `    B${i}(n) => n.toString()`,
      `  }`,
      `}`,
      ``,
    );
  }
  return lines.join('\n');
}
```

### 3. Compare vs tsc / esbuild

```bash
# tsc baseline (on equivalent TS source)
npx tsc --noEmit --skipLibCheck corpus.ts

# esbuild baseline
npx esbuild corpus.ts --bundle=false --outfile=/dev/null
```

Record wall times with `time` command; embed in the page.

### 4. Per-phase breakdown

Instrument the compiler to emit phase timings if `SUPERJS_BENCH=1` env var is set.
Add timing spans to:
- Lexer
- Parser  
- Checker
- IR emit
- Code gen

Expose via `compile()` return value: `{ outputs, timings?: PhaseTimes }`.

### 5. Output page

Write `superjs/apps/docs/src/content/docs/perf/index.md`:

```markdown
---
title: 'Performance Benchmarks'
description: 'SuperJS compiler and LSP performance numbers.'
---

# Performance Benchmarks

Measured on: Apple M-series / Ubuntu 22.04, Node 20 LTS.

## Compile time

| Input size | Cold compile | Warm (avg 5x) | vs tsc | vs esbuild |
|-----------|-------------|--------------|--------|-----------|
| stdlib (N LOC) | Xms | Xms | Xtsc | Xesbuild |
| 10k LOC | Xms | Xms | Xtsc | Xesbuild |

## LSP

| Metric | Value | Target |
|--------|-------|--------|
| Idle memory (100k LOC) | XMB | ≤250MB |
| P99 hover | Xms | ≤200ms |

## Per-phase breakdown (10k LOC cold)

| Phase | Time |
|-------|------|
| Lexer | Xms |
| Parser | Xms |
| Checker | Xms |
| IR emit | Xms |
| Code gen | Xms |

_Last updated: YYYY-MM-DD. [Reproduce](https://github.com/hbarve1/super-js/blob/main/scripts/bench.ts)_
```

Commit the page with actual measured numbers (not placeholders).

## Implementation steps

1. Write `scripts/gen-bench-corpus.ts` — generates 10k LOC SJS file.
2. Write `scripts/bench.ts` — benchmark harness.
3. Run corpus through `superjs check` first — ensure it compiles without errors.
4. Run benchmark: `npx tsx scripts/bench.ts` — record numbers.
5. Measure tsc on equivalent TS: generate equivalent `.ts` file, run `tsc --noEmit`.
6. Measure esbuild: run `esbuild corpus.ts --outfile=/dev/null`.
7. For LSP metrics: start LSP with 100k LOC loaded, snapshot heap, run 100 hover requests.
8. Write `perf/index.md` with real numbers.
9. Run `nx build docs` — confirm page renders.

## Acceptance criteria

- [ ] `scripts/bench.ts` exists and runs without error
- [ ] `scripts/gen-bench-corpus.ts` generates valid SJS that compiles clean
- [ ] `perf/index.md` has real measured numbers (not placeholder X values)
- [ ] Cold compile 10k LOC measured and published
- [ ] Warm compile measured (avg of 5 runs)
- [ ] tsc and esbuild comparison numbers included
- [ ] Per-phase breakdown table included
- [ ] LSP heap and P99 hover measured (or documented as "measured separately")
- [ ] `nx build docs` → perf page renders correctly

## Notes

- If LSP metrics are hard to automate, measure manually and hard-code; note measurement method
- Do NOT fabricate numbers — measure on real hardware and document the machine specs
- If cold compile exceeds 2s target, document it honestly; do not hide
- Per-phase instrumentation is optional; skip if it requires compiler changes that break other things
