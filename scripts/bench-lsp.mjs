#!/usr/bin/env node
/**
 * bench-lsp.mjs — LSP idle memory + hover latency benchmarks.
 *
 * Prerequisites:
 *   cd superjs && pnpm nx build lsp
 *
 * Run from repo root (use --expose-gc for stable heap readings):
 *   node --expose-gc scripts/bench-lsp.mjs
 *
 * Merges into benchmarks/results.json (run scripts/bench.mjs first for compile section).
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { LspServer } from '../superjs/libs/lsp/dist/index.js';
import { genSjsCorpus } from './gen-bench-corpus.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const RESULTS = join(ROOT, 'benchmarks', 'results.json');

const TARGET_LOC = 100_000;
const HOVER_SAMPLES = 200;
const TARGET_IDLE_MB = 250;
const TARGET_P99_MS = 200;

/** @param {number[]} xs */
function percentile(xs, p) {
  const sorted = [...xs].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

function benchLsp() {
  const sent = [];
  const server = new LspServer((m) => sent.push(m));
  server.handle({
    id: 1,
    method: 'initialize',
    params: { initializationOptions: { memoryBudgetMB: 512 } },
  });

  const source = genSjsCorpus(TARGET_LOC);
  const loc = source.split('\n').length;
  const uri = 'file:///benchmarks/corpus-100k.sjs';

  const openStart = performance.now();
  server.handle({
    method: 'textDocument/didOpen',
    params: { textDocument: { uri, languageId: 'superjs', version: 1, text: source } },
  });
  const openMs = performance.now() - openStart;

  if (typeof globalThis.gc === 'function') globalThis.gc();
  const idleMemoryMb = round1(process.memoryUsage().heapUsed / 1024 / 1024);

  const hoverLine = 1;
  const hoverChar = 15;
  const hoverTimes = [];
  for (let i = 0; i < HOVER_SAMPLES; i++) {
    const t0 = performance.now();
    server.handle({
      id: 10 + i,
      method: 'textDocument/hover',
      params: {
        textDocument: { uri },
        position: { line: hoverLine, character: hoverChar },
      },
    });
    hoverTimes.push(performance.now() - t0);
  }

  const p50HoverMs = round1(percentile(hoverTimes, 50));
  const p99HoverMs = round1(percentile(hoverTimes, 99));

  return {
    corpusLoc: loc,
    openMs: round1(openMs),
    idleMemoryMb,
    hoverSamples: HOVER_SAMPLES,
    p50HoverMs,
    p99HoverMs,
    withinTargets: {
      idleMemoryMb: idleMemoryMb <= TARGET_IDLE_MB,
      p99HoverMs: p99HoverMs <= TARGET_P99_MS,
    },
  };
}

function main() {
  const lsp = benchLsp();

  let payload;
  if (existsSync(RESULTS)) {
    payload = JSON.parse(readFileSync(RESULTS, 'utf8'));
  } else {
    payload = {
      measuredAt: new Date().toISOString().slice(0, 10),
      host: { platform: process.platform, arch: process.arch, node: process.version },
      targets: {
        coldCompile10kMs: 2000,
        warmCompile10kMs: 100,
        lspIdleMemoryMb: TARGET_IDLE_MB,
        lspP99HoverMs: TARGET_P99_MS,
      },
      compile: null,
    };
  }

  payload.lsp = lsp;
  payload.measuredAt = new Date().toISOString().slice(0, 10);

  writeFileSync(RESULTS, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(JSON.stringify({ lsp }, null, 2));

  if (!lsp.withinTargets.idleMemoryMb || !lsp.withinTargets.p99HoverMs) {
    console.error('\nLSP benchmarks exceeded Stage 6 targets.');
    process.exit(1);
  }
  console.error(`\nUpdated ${RESULTS}`);
}

main();
