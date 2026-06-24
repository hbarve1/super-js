#!/usr/bin/env node
/**
 * rc-preflight.mjs — run automated gates before tagging 1.0.0-rc.N.
 *
 *   node scripts/rc-preflight.mjs
 *   node scripts/rc-preflight.mjs --skip-slow   # skip playground worker bundle
 */
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const skipSlow = process.argv.includes('--skip-slow');

const steps = [
  ['Docs internal links', 'node scripts/check-docs-links.mjs'],
  ['Error-code pages', 'node scripts/check-error-pages.mjs'],
  ['Compat matrix', 'node scripts/check-compat-matrix.mjs'],
  ['Benchmark results', 'node scripts/check-bench-results.mjs'],
  ['LSP memory audit', 'node scripts/check-lsp-memory-audit.mjs'],
  ['Grammar validation', 'node scripts/validate-grammar.mjs'],
  ['Language spec assembled', 'node scripts/assemble-language-spec.mjs && git diff --exit-code specs/language.md'],
  ['npm audit (high+)', 'pnpm audit --audit-level=high', join(ROOT, 'superjs')],
];

if (!skipSlow) {
  steps.push(['Playground worker bundle', 'node scripts/check-playground-worker.mjs']);
}

let failed = 0;
for (const [name, cmd, cwd] of steps) {
  process.stderr.write(`▶ ${name}… `);
  try {
    execSync(cmd, { cwd: cwd ?? ROOT, stdio: 'pipe' });
    console.error('OK');
  } catch (e) {
    console.error('FAIL');
    if (e.stdout) process.stdout.write(e.stdout);
    if (e.stderr) process.stderr.write(e.stderr);
    failed++;
  }
}

console.error(`\n${steps.length - failed}/${steps.length} checks passed.`);

if (failed > 0) {
  console.error('\nRC preflight failed. Fix before tagging rc.N.');
  process.exit(1);
}

console.error('\nAutomated RC preflight passed.');
console.error('Human gates still required: security review (S7), beta teams, npm token rotation, playground CF deploy.');
process.exit(0);
