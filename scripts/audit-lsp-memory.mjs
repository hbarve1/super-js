#!/usr/bin/env node
/**
 * audit-lsp-memory.mjs — LSP heap audit for Stage 6 / v1.0 RC readiness.
 *
 * Measures idle heap after opening a ~100k LOC corpus, verifies didClose
 * releases memory, and checks LRU eviction keeps multi-file sessions bounded.
 *
 * Prerequisites:
 *   cd superjs && pnpm nx build lsp
 *
 * Run from repo root (use --expose-gc for stable readings):
 *   node --expose-gc scripts/audit-lsp-memory.mjs
 *   node --expose-gc scripts/audit-lsp-memory.mjs --snapshot
 *
 * Writes benchmarks/lsp-memory-audit.json
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeHeapSnapshot } from 'node:v8';
import { LspServer } from '../superjs/libs/lsp/dist/index.js';
import { genSjsCorpus } from './gen-bench-corpus.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'benchmarks', 'lsp-memory-audit.json');

const TARGET_LOC = 100_000;
const IDLE_MB_LIMIT = 250;
/** After didClose + gc, heap should drop by at least this fraction vs idle-open. */
const CLOSE_RELEASE_RATIO = 0.35;
/** Multi-file LRU: five ~20k LOC files with a 2 MiB budget — plateau under this. */
const LRU_PLATEAU_MB = 120;

function round1(n) {
  return Math.round(n * 10) / 10;
}

function heapMb() {
  return round1(process.memoryUsage().heapUsed / 1024 / 1024);
}

function gc() {
  if (typeof globalThis.gc === 'function') globalThis.gc();
}

function open(server, uri, text) {
  server.handle({
    method: 'textDocument/didOpen',
    params: { textDocument: { uri, languageId: 'superjs', version: 1, text } },
  });
}

function close(server, uri) {
  server.handle({
    method: 'textDocument/didClose',
    params: { textDocument: { uri } },
  });
}

function init(server, memoryBudgetMB) {
  server.handle({
    id: 1,
    method: 'initialize',
    params: { initializationOptions: { memoryBudgetMB } },
  });
}

/** Single large document — primary Stage 6 audit scenario. */
function auditSingleFile() {
  const sent = [];
  const server = new LspServer((m) => sent.push(m));
  init(server, 512);

  const source = genSjsCorpus(TARGET_LOC);
  const uri = 'file:///audit/corpus-100k.sjs';
  const sourceBytes = source.length * 2;
  const loc = source.split('\n').length;

  gc();
  const baselineMb = heapMb();
  open(server, uri, source);
  gc();
  const idleOpenMb = heapMb();
  close(server, uri);
  gc();
  const afterCloseMb = heapMb();

  const releasedMb = round1(idleOpenMb - afterCloseMb);
  const releaseRatio = idleOpenMb > 0 ? releasedMb / idleOpenMb : 0;

  return {
    loc,
    sourceBytes,
    sourceMb: round1(sourceBytes / 1024 / 1024),
    baselineMb,
    idleOpenMb,
    afterCloseMb,
    releasedMb,
    releaseRatio: round1(releaseRatio),
    withinTarget: idleOpenMb <= IDLE_MB_LIMIT,
    closeReleased: releaseRatio >= CLOSE_RELEASE_RATIO,
  };
}

/** Five medium files with a tiny budget — LRU should evict older docs. */
function auditLruPlateau() {
  const sent = [];
  const server = new LspServer((m) => sent.push(m));
  init(server, 2); // 2 MiB — fits ~1 medium file of analysis overhead + source

  const chunk = genSjsCorpus(20_000);
  const uris = [];
  gc();
  const baselineMb = heapMb();

  for (let i = 0; i < 5; i++) {
    const uri = `file:///audit/medium-${i}.sjs`;
    uris.push(uri);
    open(server, uri, chunk.replaceAll('fn0', `fn${i}`));
    gc();
  }
  const plateauMb = heapMb();

  // Oldest files should be evicted — outline on file 0 returns empty.
  server.handle({
    id: 50,
    method: 'textDocument/documentSymbol',
    params: { textDocument: { uri: uris[0] } },
  });
  const oldestEvicted = (sent.at(-1)?.result ?? []).length === 0;

  return {
    filesOpened: uris.length,
    budgetMb: 2,
    baselineMb,
    plateauMb,
    growthMb: round1(plateauMb - baselineMb),
    oldestEvicted,
    withinPlateau: plateauMb <= LRU_PLATEAU_MB,
  };
}

function main() {
  const writeSnapshot = process.argv.includes('--snapshot');
  if (writeSnapshot && typeof globalThis.gc !== 'function') {
    console.error('Pass --expose-gc when using --snapshot');
    process.exit(1);
  }

  const single = auditSingleFile();
  const lru = auditLruPlateau();

  let snapshotPath;
  if (writeSnapshot) {
    const sent = [];
    const server = new LspServer((m) => sent.push(m));
    init(server, 512);
    open(server, 'file:///audit/snapshot.sjs', genSjsCorpus(TARGET_LOC));
    gc();
    snapshotPath = join(ROOT, 'benchmarks', `lsp-heap-${Date.now()}.heapsnapshot`);
    writeHeapSnapshot(snapshotPath);
    close(server, 'file:///audit/snapshot.sjs');
  }

  const report = {
    measuredAt: new Date().toISOString(),
    node: process.version,
    exposeGc: typeof globalThis.gc === 'function',
    targets: {
      idleOpenMb: IDLE_MB_LIMIT,
      closeReleaseRatio: CLOSE_RELEASE_RATIO,
      lruPlateauMb: LRU_PLATEAU_MB,
    },
    singleFile: single,
    lruEviction: lru,
    snapshotPath: snapshotPath ?? null,
    findings: [
      'Primary retention: parsed AST, type environment, and diagnostics per open file (compiler FileState).',
      'LSP sources map shares the same string reference as compiler rawSources when opened via didOpen.',
      'LRU eviction (lsp.memoryBudgetMB) drops evicted files from sources + compiler via removeFile.',
      'didClose clears all per-file state; heap drops measurably after gc.',
      'Bench harness (bench-lsp.mjs) idle reading is authoritative for CI; this audit adds close/LRU checks.',
    ],
    pass:
      single.withinTarget &&
      single.closeReleased &&
      lru.oldestEvicted &&
      lru.withinPlateau,
  };

  writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));

  if (!report.pass) {
    console.error('\nLSP memory audit failed one or more checks.');
    process.exit(1);
  }
  console.error(`\nWrote ${OUT}`);
}

main();
