#!/usr/bin/env node
/**
 * check-bench-results.mjs — verify committed benchmark results match harness output shape
 * and Stage 6 targets. Does not re-run benchmarks (too slow for CI).
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RESULTS = join(dirname(fileURLToPath(import.meta.url)), '..', 'benchmarks', 'results.json');

if (!existsSync(RESULTS)) {
  console.error('Missing benchmarks/results.json — run: node scripts/bench.mjs');
  process.exit(1);
}

const data = JSON.parse(readFileSync(RESULTS, 'utf8'));
const required = ['measuredAt', 'host', 'compile', 'targets', 'lsp'];
for (const key of required) {
  if (!(key in data)) {
    console.error(`benchmarks/results.json missing key: ${key}`);
    process.exit(1);
  }
}
if (!data.compile.corpus10k?.coldMs || !data.compile.comparison?.tscTypecheckMs) {
  console.error('benchmarks/results.json missing compile measurements');
  process.exit(1);
}

const { targets } = data;
if (data.compile.corpus10k.coldMs > targets.coldCompile10kMs) {
  console.error(`Cold compile ${data.compile.corpus10k.coldMs}ms exceeds target ${targets.coldCompile10kMs}ms`);
  process.exit(1);
}
if (data.compile.corpus10k.warmMs > targets.warmCompile10kMs) {
  console.error(`Warm compile ${data.compile.corpus10k.warmMs}ms exceeds target ${targets.warmCompile10kMs}ms`);
  process.exit(1);
}

if (data.lsp.idleMemoryMb == null || data.lsp.p99HoverMs == null) {
  console.error('benchmarks/results.json missing LSP measurements — run: node --expose-gc scripts/bench-lsp.mjs');
  process.exit(1);
}
if (data.lsp.idleMemoryMb > targets.lspIdleMemoryMb) {
  console.error(`LSP idle memory ${data.lsp.idleMemoryMb}MB exceeds target ${targets.lspIdleMemoryMb}MB`);
  process.exit(1);
}
if (data.lsp.p99HoverMs > targets.lspP99HoverMs) {
  console.error(`LSP P99 hover ${data.lsp.p99HoverMs}ms exceeds target ${targets.lspP99HoverMs}ms`);
  process.exit(1);
}

console.log(
  `Benchmark results OK (${data.measuredAt}, cold ${data.compile.corpus10k.coldMs}ms, LSP ${data.lsp.idleMemoryMb}MB / P99 ${data.lsp.p99HoverMs}ms).`,
);
