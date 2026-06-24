#!/usr/bin/env node
/**
 * check-lsp-memory-audit.mjs — verify committed LSP memory audit report.
 * Does not re-run the audit (requires --expose-gc); run audit-lsp-memory.mjs locally.
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPORT = join(dirname(fileURLToPath(import.meta.url)), '..', 'benchmarks', 'lsp-memory-audit.json');

if (!existsSync(REPORT)) {
  console.error('Missing benchmarks/lsp-memory-audit.json — run: node --expose-gc scripts/audit-lsp-memory.mjs');
  process.exit(1);
}

const data = JSON.parse(readFileSync(REPORT, 'utf8'));
const required = ['measuredAt', 'singleFile', 'lruEviction', 'pass', 'targets'];
for (const key of required) {
  if (!(key in data)) {
    console.error(`lsp-memory-audit.json missing key: ${key}`);
    process.exit(1);
  }
}

if (!data.pass) {
  console.error('lsp-memory-audit.json reports pass=false');
  process.exit(1);
}

const { singleFile, lruEviction, targets } = data;
if (singleFile.idleOpenMb > targets.idleOpenMb) {
  console.error(`Idle open ${singleFile.idleOpenMb}MB exceeds ${targets.idleOpenMb}MB`);
  process.exit(1);
}
if (!singleFile.closeReleased) {
  console.error('didClose memory release check failed');
  process.exit(1);
}
if (!lruEviction.oldestEvicted || !lruEviction.withinPlateau) {
  console.error('LRU eviction checks failed');
  process.exit(1);
}

console.log('LSP memory audit report OK.');
