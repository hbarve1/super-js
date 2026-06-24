#!/usr/bin/env node
/**
 * check-bench-results.mjs — verify committed benchmark results match harness output shape.
 * Does not re-run benchmarks (too slow for CI). Ensures results.json exists and is valid.
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
const required = ['measuredAt', 'host', 'compile'];
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
console.log(`Benchmark results OK (${data.measuredAt}, corpus cold ${data.compile.corpus10k.coldMs}ms).`);
