#!/usr/bin/env node
/**
 * bench.mjs — SuperJS compiler benchmark harness.
 *
 * Prerequisites:
 *   cd superjs && pnpm nx build compiler
 *
 * Run from repo root:
 *   node scripts/gen-bench-corpus.mjs
 *   node scripts/bench.mjs
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import os from 'node:os';
import { compile } from '../superjs/libs/compiler/dist/index.js';
import { genSjsCorpus, genTsCorpus } from './gen-bench-corpus.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const BENCH_DIR = join(ROOT, 'benchmarks');
const STDLIB_DIR = join(ROOT, 'superjs', 'libs', 'stdlib', 'src', 'modules');
const SUPERJS_DIR = join(ROOT, 'superjs');
const WARM_RUNS = 5;

/** @param {number} ms */
function round(ms) {
  return Math.round(ms * 10) / 10;
}

/** @param {number} a @param {number} b */
function ratio(a, b) {
  if (b === 0) return null;
  return Math.round((a / b) * 100) / 100;
}

/**
 * @param {string} name
 * @param {Array<{ filename: string; source: string }>} files
 * @param {number} runs
 */
async function benchSjs(name, files, runs = WARM_RUNS) {
  const loc = files.reduce((n, f) => n + f.source.split('\n').length, 0);

  const coldStart = performance.now();
  let result = await compile(files, { sourceMap: 'none' });
  const coldMs = performance.now() - coldStart;
  const errors = result.diagnostics.filter((d) => d.severity === 'error');
  if (errors.length > 0) {
    throw new Error(`${name}: compile errors: ${errors.map((e) => e.message).join('; ')}`);
  }

  const warmTimes = [];
  for (let i = 0; i < runs; i++) {
    const t0 = performance.now();
    result = await compile(files, { sourceMap: 'none' });
    warmTimes.push(performance.now() - t0);
  }
  const warmMs = warmTimes.reduce((a, b) => a + b, 0) / warmTimes.length;

  return { name, loc, coldMs: round(coldMs), warmMs: round(warmMs), runs };
}

/** @param {string} filePath @param {'tsc' | 'esbuild'} tool */
function benchExternal(filePath, tool) {
  const t0 = performance.now();
  if (tool === 'tsc') {
    const rel = filePath.startsWith(ROOT) ? filePath.slice(ROOT.length + 1) : filePath;
    const fromSuperjs = rel.startsWith('benchmarks/') ? `../${rel}` : rel;
    const r = spawnSync(
      'pnpm',
      ['exec', 'tsc', '--noEmit', '--skipLibCheck', '--ignoreConfig', fromSuperjs],
      { cwd: SUPERJS_DIR, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
    if (r.status !== 0) {
      throw new Error(`tsc failed: ${r.stderr || r.stdout}`);
    }
  } else {
    const rel = filePath.startsWith(ROOT) ? filePath.slice(ROOT.length + 1) : filePath;
    const fromSuperjs = rel.startsWith('benchmarks/') ? `../${rel}` : rel;
    const r = spawnSync(
      'pnpm',
      ['exec', 'esbuild', fromSuperjs, '--bundle=false', '--outfile=/dev/null'],
      { cwd: SUPERJS_DIR, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
    if (r.status !== 0) {
      throw new Error(`esbuild failed: ${r.stderr || r.stdout}`);
    }
  }
  return round(performance.now() - t0);
}

function loadStdlibFiles() {
  return readdirSync(STDLIB_DIR)
    .filter((f) => f.endsWith('.sjs'))
    .map((f) => ({
      filename: f,
      source: readFileSync(join(STDLIB_DIR, f), 'utf8'),
    }));
}

function ensureCorpus() {
  mkdirSync(BENCH_DIR, { recursive: true });
  const sjsPath = join(BENCH_DIR, 'corpus-10k.sjs');
  const tsPath = join(BENCH_DIR, 'corpus-10k.ts');
  if (!existsSync(sjsPath) || !existsSync(tsPath)) {
    writeFileSync(sjsPath, genSjsCorpus(10_000));
    writeFileSync(tsPath, genTsCorpus(10_000));
  }
  return {
    sjsPath,
    tsPath,
    sjsSource: readFileSync(sjsPath, 'utf8'),
  };
}

async function main() {
  const corpus = ensureCorpus();
  const stdlibFiles = loadStdlibFiles();

  const stdlib = await benchSjs('stdlib', stdlibFiles);
  const corpus10k = await benchSjs('10k LOC', [{ filename: 'corpus-10k.sjs', source: corpus.sjsSource }]);

  const tscMs = benchExternal(corpus.tsPath, 'tsc');
  const esbuildMs = benchExternal(corpus.tsPath, 'esbuild');

  const payload = {
    measuredAt: new Date().toISOString().slice(0, 10),
    host: {
      platform: process.platform,
      arch: process.arch,
      node: process.version,
      cpus: os.cpus().length,
    },
    targets: {
      coldCompile10kMs: 2000,
      warmCompile10kMs: 100,
      lspIdleMemoryMb: 250,
      lspP99HoverMs: 200,
    },
    compile: {
      stdlib,
      corpus10k,
      comparison: {
        tscTypecheckMs: tscMs,
        esbuildTranspileMs: esbuildMs,
        sjsVsTsc: ratio(corpus10k.coldMs, tscMs),
        sjsVsEsbuild: ratio(corpus10k.coldMs, esbuildMs),
      },
    },
    lsp: {
      note: 'LSP heap and P99 hover are measured manually until an automated harness lands.',
      idleMemoryMb: null,
      p99HoverMs: null,
    },
  };

  const outPath = join(BENCH_DIR, 'results.json');
  writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(JSON.stringify(payload, null, 2));
  console.error(`\nWrote ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
